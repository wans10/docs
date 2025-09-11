import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { FernNextResponse } from "@fern-api/docs-server/FernNextResponse";
import { preferPreview } from "@fern-api/docs-server/auth/origin";
import { getReturnToQueryParam } from "@fern-api/docs-server/auth/return-to";
import { withSecureCookie } from "@fern-api/docs-server/auth/with-secure-cookie";
import { getWorkOSClientId, workos } from "@fern-api/docs-server/auth/workos";
import { encryptSession } from "@fern-api/docs-server/auth/workos-session";
import { isLocal } from "@fern-api/docs-server/isLocal";
import { isSelfHosted } from "@fern-api/docs-server/isSelfHosted";
import { safeUrl } from "@fern-api/docs-server/safeUrl";
import { getDocsDomainEdge } from "@fern-api/docs-server/xfernhost/edge";
import { COOKIE_FERN_TOKEN, withoutStaging } from "@fern-api/docs-utils";
import { withDefaultProtocol } from "@fern-api/ui-core-utils";
import { getAuthEdgeConfig } from "@fern-docs/edge-config";

export const runtime = "edge";

const FORWARDED_HOST_QUERY = "forwarded_host";
const CODE_QUERY = "code";
const ERROR_DESCRIPTION_QUERY = "error_description";
const ERROR_QUERY = "error";
const ERROR_URI_QUERY = "error_uri";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (isLocal() || isSelfHosted()) {
    return new NextResponse("sso is not accessible in local preview mode", {
      status: 400,
    });
  }

  const domain = getDocsDomainEdge(req);
  const domainWithoutStaging = withoutStaging(domain);
  const host = req.nextUrl.host;
  const errorDescription = req.nextUrl.searchParams.get(
    ERROR_DESCRIPTION_QUERY
  );
  const error = req.nextUrl.searchParams.get(ERROR_QUERY);
  const errorUri = req.nextUrl.searchParams.get(ERROR_URI_QUERY); // note: this contains reference to the WorkOS docs

  if (error != null) {
    // TODO: store this login attempt in posthog

    console.error(`[sso:callback] ${error}, ${errorDescription}, ${errorUri}`);
    return new NextResponse(null, { status: 400 });
  }

  // TODO: this is based on an incorrect implementation of the state param— we need to sign it with a JWT.
  const return_to_param = getReturnToQueryParam();
  const return_to = req.nextUrl.searchParams.get(return_to_param);
  const url =
    safeUrl(return_to) ??
    safeUrl(withDefaultProtocol(preferPreview(host, domainWithoutStaging)));

  if (url == null) {
    console.error(`Invalid ${return_to_param} param provided:`, return_to);
    return new NextResponse(null, { status: 400 });
  }

  // if the current url is legacy.ferndocs.com, we should redirect to ***.docs.buildwithfern.com
  if (req.nextUrl.host !== url.host && getDocsDomainEdge(req) !== url.host) {
    if (
      req.nextUrl.searchParams.get(FORWARDED_HOST_QUERY) === req.nextUrl.host
    ) {
      console.error(
        FORWARDED_HOST_QUERY,
        "is the same as the host:",
        String(req.nextUrl.searchParams.get(FORWARDED_HOST_QUERY))
      );
      return new NextResponse(null, { status: 400 });
    }

    // TODO: need to support docs instances with subpaths (forward-proxied from the origin).
    const destination = new URL(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      url.origin
    );
    destination.searchParams.set(FORWARDED_HOST_QUERY, req.nextUrl.host);
    const allowedDestinations = [withDefaultProtocol(getDocsDomainEdge(req))];

    // if the url.host exists in the edge config, we should add it to the allowed destinations
    if (await getAuthEdgeConfig(url.host)) {
      allowedDestinations.push(url.origin);
    }

    return FernNextResponse.redirect(req, {
      destination,
      allowedDestinations,
    });
  }

  const code = req.nextUrl.searchParams.get(CODE_QUERY);

  if (code == null) {
    console.error("[sso:callback] No code param provided");
    return new NextResponse(null, { status: 400 });
  }

  try {
    const { accessToken, refreshToken, user, impersonator } =
      await workos().userManagement.authenticateWithCode({
        code,
        clientId: getWorkOSClientId(),
      });

    if (!accessToken || !refreshToken) {
      throw new Error("response is missing tokens");
    }

    const session = await encryptSession({
      accessToken,
      refreshToken,
      user,
      impersonator,
    });

    // TODO: check if we need to run `getAllowedRedirectUrls(config)` because we don't have the edge config imported here
    const res = FernNextResponse.redirect(req, { destination: url });
    const cookieJar = await cookies();
    cookieJar.set(COOKIE_FERN_TOKEN, session, withSecureCookie(url.origin));

    return res;
  } catch (error) {
    const errorRes = {
      error: error instanceof Error ? error.message : String(error),
    };

    console.error(`[sso:callback] ${JSON.stringify(errorRes)}`);

    return errorResponse();
  }
}

function errorResponse() {
  const errorBody = {
    error: {
      message: "Something went wrong!",
      description:
        "Couldn't sign in. If you are not sure what happened, please contact your organization admin.",
    },
  };
  return NextResponse.json(errorBody, { status: 500 });
}
