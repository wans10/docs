import "server-only";

import { createCachedDocsLoader } from "@fern-api/docs-loader";
import { getFallbackProduct, getFallbackVersion } from "@fern-api/docs-server";
import { FernNavigation } from "@fern-api/fdr-sdk";
import { slugjoin } from "@fern-api/fdr-sdk/navigation";

import { getFernToken } from "@/app/fern-token";
import { VersionDropdown } from "@/components/header/VersionDropdown";

export default async function VersionSelectPage({
  params,
}: {
  params: Promise<{ host: string; domain: string; slug: string }>;
}) {
  const { host, domain, slug } = await params;
  const loader = await createCachedDocsLoader(
    host,
    domain,
    await getFernToken()
  );

  // preload:
  const [layout, _auth, _flags, root] = await Promise.all([
    loader.getLayout(),
    loader.getAuthState(),
    loader.getEdgeFlags(),
    loader.getRoot(),
  ]);
  const useDenseLayout = layout.isHeaderDisabled;

  const foundNode = FernNavigation.utils.findNode(root, slugjoin(slug));
  const collector = FernNavigation.NodeCollector.collect(root);
  const versionNodes = collector.getVersionNodes();

  if (versionNodes.length === 0) {
    return null;
  }

  const currentProduct = getFallbackProduct(foundNode, root, slug);
  const version = getFallbackVersion(foundNode, root, slug);

  if (version == null) {
    return null;
  }

  const currentNode = foundNode.type === "found" ? foundNode.node : version;

  const parents =
    foundNode.type === "found" ? Array.from(foundNode.parents) : [];

  return (
    <VersionDropdown
      loader={loader}
      currentNode={currentNode}
      currentProduct={currentProduct ?? undefined}
      slugMap={collector.slugMap}
      parents={parents}
      fallbackVersion={version}
      useDenseLayout={useDenseLayout}
    />
  );
}
