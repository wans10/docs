import "server-only";

import { createCachedDocsLoader } from "@fern-api/docs-loader";
import { getFallbackProduct } from "@fern-api/docs-server";
import { FernNavigation } from "@fern-api/fdr-sdk";
import { slugjoin } from "@fern-api/fdr-sdk/navigation";

import { getFernToken } from "@/app/fern-token";
import { ProductDropdown } from "@/components/header/ProductDropdown";

export default async function ProductSelectPage({
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

  const fallbackProduct = getFallbackProduct(foundNode, root, slug);
  if (fallbackProduct == null) {
    return null;
  }

  return (
    <ProductDropdown
      loader={loader}
      fallbackProduct={fallbackProduct}
      useDenseLayout={useDenseLayout}
    />
  );
}
