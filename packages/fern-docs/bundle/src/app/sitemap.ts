import type { MetadataRoute } from "next";

import urljoin from "url-join";

import { createCachedDocsLoader } from "@fern-api/docs-loader";
import { isLocal } from "@fern-api/docs-server/isLocal";
import { isSelfHosted } from "@fern-api/docs-server/isSelfHosted";
import {
  getDocsDomainApp,
  getDocsHostApp,
} from "@fern-api/docs-server/xfernhost/app";
import { conformTrailingSlash } from "@fern-api/docs-utils";
import { NodeCollector } from "@fern-api/fdr-sdk/navigation";
import { withDefaultProtocol } from "@fern-api/ui-core-utils";
import { getCanonicalUrl } from "@fern-docs/edge-config";

import { getFernToken } from "./fern-token";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isLocal() || isSelfHosted()) {
    return [];
  }

  const host = await getDocsHostApp();
  const domain = await getDocsDomainApp();
  const canonicalUrl = await getCanonicalUrl(domain);
  const loader = await createCachedDocsLoader(
    host,
    domain,
    await getFernToken()
  );
  const root = await loader.getRoot();

  // collect all indexable page slugs
  const slugs = NodeCollector.collect(root).indexablePageSlugs;

  // convert slugs to full urls
  const urls = slugs.map((slug) =>
    conformTrailingSlash(
      urljoin(withDefaultProtocol(canonicalUrl ?? domain), slug)
    )
  );

  return [...urls.map((url) => ({ url }))];
}
