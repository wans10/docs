import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";

import { isPreviewDomain, withoutStaging } from "@fern-api/docs-utils";
import { APIResponse, FdrAPI } from "@fern-api/fdr-sdk/client/types";

import { isLocal } from "./isLocal";
import { isSelfHosted } from "./isSelfHosted";
import { loadDocsDefinitionFromS3 } from "./loadDocsDefinitionFromS3";
import { provideRegistryService } from "./registry";

export type LoadWithUrlResponse = APIResponse<
  FdrAPI.docs.v2.read.LoadDocsForUrlResponse,
  FdrAPI.docs.v2.read.getDocsForUrl.Error
>;

/**
 * - If the token is a WorkOS token, we need to use the getPrivateDocsForUrl endpoint.
 * - Otherwise, we can use the getDocsForUrl endpoint (including custom auth).
 *
 * Note: this function cannot be stored in the data cache because the response can be > 2MB,
 */
export const loadWithUrl = cache(
  async (
    domain: string
  ): Promise<FdrAPI.docs.v2.read.LoadDocsForUrlResponse> => {
    return unstable_cache(
      async () => {
        const domainWithoutStaging = withoutStaging(domain);

        // address FDR error: Failed to parse URL: %5Bdomain%5D
        // todo: figure out where these calls originate
        if (domain.includes("[") || domain.includes("%5B")) {
          console.error("Cannot load docs from an invalid domain");
          notFound();
        }

        if (isLocal()) {
          const response =
            await provideRegistryService().docs.v2.read.getDocsForUrl({
              url: FdrAPI.Url("/"),
            });
          if (response.ok) {
            return response.body;
          }
          console.error("Failed to load docs", {
            cause: response.error,
          });
          notFound();
        }

        if (isSelfHosted()) {
          const docsUrl = process.env.NEXT_PUBLIC_DOCS_DOMAIN ?? "";
          if (isSelfHosted() && !docsUrl) {
            notFound();
          }

          const response =
            await provideRegistryService().docs.v2.read.getDocsForUrl({
              url: FdrAPI.Url(docsUrl),
            });
          if (response.ok) {
            return response.body;
          }
          console.error("Failed to load docs", {
            cause: response.error,
          });
          notFound();
        }

        try {
          const response = await loadDocsDefinitionFromS3(
            domainWithoutStaging,
            getDocsDefinitionBucketName()
          );
          if (response != null) {
            return response;
          }
        } catch (error) {
          console.error("Failed to load docs definition:", error);
        }

        if (isPreviewDomain(domain)) {
          console.error("Failing to load preview link: ", domain);
          notFound();
        }

        const response =
          await provideRegistryService().docs.v2.read.getDocsForUrl({
            url: FdrAPI.Url(domainWithoutStaging),
          });
        if (response.ok) {
          return response.body;
        }
        console.error("Failed to load docs", {
          cause: response.error,
        });
        notFound();
      },
      [domain],
      { tags: ["loadWithUrl", domain] }
    )();
  }
);

function getDocsDefinitionBucketName() {
  return (
    process.env.DOCS_DEFINITION_S3_BUCKET_NAME ??
    "fdr-dev2-docs-definitions-public"
  );
}
