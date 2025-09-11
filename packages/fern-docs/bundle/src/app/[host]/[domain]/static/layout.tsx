import "server-only";

import { createCachedDocsLoader } from "@fern-api/docs-loader";

import SharedLayout from "@/components/shared-layout";

export default async function Layout({
  children,
  params,
  headertabs,
  sidebar,
  versionSelect,
  productSelect,
  logo,
  explorer,
}: {
  children: React.ReactNode;
  params: Promise<{ host: string; domain: string }>;
  headertabs: React.ReactNode;
  sidebar: React.ReactNode;
  versionSelect: React.ReactNode;
  productSelect: React.ReactNode;
  logo: React.ReactNode;
  explorer: React.ReactNode;
}) {
  const { host, domain } = await params;
  const loader = await createCachedDocsLoader(host, domain);
  return (
    <SharedLayout
      loader={loader}
      headertabs={headertabs}
      versionSelect={versionSelect}
      productSelect={productSelect}
      sidebar={sidebar}
      logo={logo}
    >
      {children}
      {explorer}
    </SharedLayout>
  );
}
