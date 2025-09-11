import { unstable_cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { Feed, Item } from "feed";
import urlJoin from "url-join";

import { createCachedDocsLoader } from "@fern-api/docs-loader";
import { FernNextResponse } from "@fern-api/docs-server/FernNextResponse";
import { preferPreview } from "@fern-api/docs-server/auth/origin";
import { isLocal } from "@fern-api/docs-server/isLocal";
import { isSelfHosted } from "@fern-api/docs-server/isSelfHosted";
import {
  COOKIE_FERN_TOKEN,
  getRedirectForPath,
  slugToHref,
} from "@fern-api/docs-utils";
import { FileData } from "@fern-api/docs-utils/types/file-data";
import type { DocsV1Read } from "@fern-api/fdr-sdk/client/types";
import * as FernNavigation from "@fern-api/fdr-sdk/navigation";
import { NodeCollector } from "@fern-api/fdr-sdk/navigation";
import { assertNever, withDefaultProtocol } from "@fern-api/ui-core-utils";
import { getEdgeFlags } from "@fern-docs/edge-config";
import { getFrontmatter } from "@fern-docs/mdx";

const FORMATS = ["rss", "atom", "json"] as const;
type Format = (typeof FORMATS)[number];

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ host: string; domain: string }> }
): Promise<NextResponse> {
  if (isLocal() || isSelfHosted()) {
    return new NextResponse(
      "changelog is not accessible in local preview mode",
      {
        status: 400,
      }
    );
  }

  const { host, domain } = await props.params;

  const path = slugToHref(req.nextUrl.searchParams.get("slug") ?? "");
  const format = getFormat(req);

  const fernToken = (await cookies()).get(COOKIE_FERN_TOKEN)?.value;

  const redirect = await checkRedirect(
    host,
    domain,
    req.nextUrl.pathname,
    fernToken
  );
  if (redirect) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.host = preferPreview(host, domain);
    nextUrl.pathname = redirect.destination;
    nextUrl.search = "";
    return FernNextResponse.redirect(req, {
      destination: nextUrl,
      allowedDestinations: [withDefaultProtocol(preferPreview(host, domain))],
    });
  }

  const accessHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (format === "json") {
    return new NextResponse(await getJsonFeed(host, domain, path, fernToken), {
      headers: {
        "Content-Type": "application/json",
        ...accessHeaders,
      },
    });
  } else if (format === "atom") {
    return new NextResponse(await getAtomFeed(host, domain, path, fernToken), {
      headers: {
        "Content-Type": "application/atom+xml",
        ...accessHeaders,
      },
    });
  } else {
    return new NextResponse(await getRssFeed(host, domain, path, fernToken), {
      headers: {
        "Content-Type": "application/rss+xml",
        ...accessHeaders,
      },
    });
  }
}

async function getJsonFeed(
  host: string,
  domain: string,
  path: string,
  fernToken: string | undefined
): Promise<string> {
  "use cache";

  unstable_cacheTag(domain, "changelog.json");

  return createFeed(host, domain, path, fernToken).then((feed) => feed.json1());
}

async function getAtomFeed(
  host: string,
  domain: string,
  path: string,
  fernToken: string | undefined
): Promise<string> {
  "use cache";

  unstable_cacheTag(domain, "changelog.atom");

  return createFeed(host, domain, path, fernToken).then((feed) => feed.atom1());
}

async function getRssFeed(
  host: string,
  domain: string,
  path: string,
  fernToken: string | undefined
): Promise<string> {
  "use cache";

  unstable_cacheTag(domain, "changelog.rss");

  return createFeed(host, domain, path, fernToken).then((feed) => feed.rss2());
}

async function createFeed(
  host: string,
  domain: string,
  path: string,
  fernToken: string | undefined
): Promise<Feed> {
  const loader = await createCachedDocsLoader(host, domain, fernToken);
  const root = await loader.getRoot();

  if (!root) {
    console.error(`[createFeed:${domain}] Could not find root`);
    notFound();
  }

  const collector = NodeCollector.collect(root);

  const node = collector.slugMap.get(FernNavigation.slugjoin(path));

  if (node?.type !== "changelog") {
    console.error(
      `[createFeed:${domain}] Node type is unexpected: ${node?.type}`
    );
    notFound();
  }

  const link = urlJoin(withDefaultProtocol(domain), node.slug);

  const feed = new Feed({
    id: link,
    link,
    title: node.title,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    generator: "buildwithfern.com",
  });

  const files = await loader.getFiles();

  await Promise.allSettled(
    node.children.flatMap((year) => {
      return year.children.flatMap((month) => {
        return month.children.map(async (entry) => {
          try {
            feed.addItem(
              await toFeedItem(entry, domain, (id) => loader.getPage(id), files)
            );
          } catch (e) {
            console.error(`[changelog:to-feed] ${JSON.stringify(e)}`);
            // TODO: sentry
          }
        });
      });
    })
  );

  return feed;
}

function isFormat(format: string): format is Format {
  return FORMATS.includes(format as Format);
}

function getFormat(req: NextRequest): Format {
  const format = req.nextUrl.searchParams.get("format");
  if (!format || !isFormat(format)) {
    return "rss";
  }
  return format;
}

async function toFeedItem(
  entry: FernNavigation.ChangelogEntryNode,
  domain: string,
  getPage: (id: string) => Promise<{ filename: string; markdown: string }>,
  files: Record<string, FileData>
): Promise<Item> {
  const item: Item = {
    title: entry.title,
    link: urlJoin(withDefaultProtocol(domain), entry.slug),
    date: new Date(entry.date),
  };

  try {
    const { markdown } = await getPage(entry.pageId);
    const { data: frontmatter, content } = getFrontmatter(markdown);
    if (frontmatter.title) {
      item.title = frontmatter.title;
    }
    item.description =
      frontmatter.description ?? frontmatter.subtitle ?? frontmatter.excerpt;

    // TODO: content should be converted into HTML markup
    item.content = content;

    let image: string | undefined;

    // TODO: (rohin) Clean up after safe deploy, but include for back compat
    if (frontmatter.image != null && typeof frontmatter.image === "string") {
      image = frontmatter.image;
    } else if (frontmatter["og:image"] != null) {
      image = toUrl(frontmatter["og:image"], files);
    }

    if (image != null) {
      validateExternalUrl(image);
      item.image = { url: image };
    }
  } catch (e) {
    console.error(`[changlelog:to-feed-item] ${JSON.stringify(e)}`);
    // TODO: sentry
  }
  return item;
}

function toUrl(
  idOrUrl: DocsV1Read.FileIdOrUrl | undefined,
  files: Record<string, FileData>
): string | undefined {
  if (idOrUrl == null) {
    return undefined;
  }
  if (idOrUrl.type === "url") {
    return idOrUrl.value;
  } else if (idOrUrl.type === "fileId") {
    return files[idOrUrl.value]?.src;
  } else {
    assertNever(idOrUrl);
  }
}

function validateExternalUrl(url: string): void {
  if (!url.startsWith("https://")) {
    throw new Error(`Invalid external URL: ${url}`);
  }
}

// hack: since redirects are handled in shared-page.tsx,
// this catches the any redirects specifically for changelogs
async function checkRedirect(
  host: string,
  domain: string,
  path: string,
  fernToken?: string
): Promise<{ destination: string; permanent: boolean } | undefined> {
  const checkForRedirects = (await getEdgeFlags(domain)).isChangelogRedirects;

  if (!checkForRedirects) {
    return undefined;
  }

  const loader = await createCachedDocsLoader(host, domain, fernToken);
  const redirects = (await loader.getConfig()).redirects;
  const { basePath } = await loader.getMetadata();

  const jsonRedirects = redirects?.filter(
    (redirect) =>
      redirect.source.endsWith(".json") ||
      redirect.source.endsWith(".atom") ||
      redirect.source.endsWith(".rss")
  );

  return getRedirectForPath(
    path,
    { domain: domain, basePath: basePath },
    jsonRedirects
  );
}
