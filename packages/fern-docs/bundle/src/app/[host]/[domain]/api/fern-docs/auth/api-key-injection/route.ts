import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import urlJoin from "url-join";
import { WebflowClient } from "webflow-api";
import type { OauthScope } from "webflow-api/api/types/OAuthScope";

import {
  APIKeyInjectionConfig,
  OryAccessTokenSchema,
} from "@fern-api/docs-auth";
import { safeVerifyFernJWTConfig } from "@fern-api/docs-server/auth/FernJWT";
import { preferPreview } from "@fern-api/docs-server/auth/origin";
import {
  OryOAuth2Client,
  getOryAuthorizationUrl,
} from "@fern-api/docs-server/auth/ory";
import { getReturnToQueryParam } from "@fern-api/docs-server/auth/return-to";
import { withSecureCookie } from "@fern-api/docs-server/auth/with-secure-cookie";
import { fernToken_admin } from "@fern-api/docs-server/env-variables";
import { isLocal } from "@fern-api/docs-server/isLocal";
import { isSelfHosted } from "@fern-api/docs-server/isSelfHosted";
import { getDocsDomainEdge } from "@fern-api/docs-server/xfernhost/edge";
import { removeTrailingSlash } from "@fern-api/docs-utils";
import { withDefaultProtocol } from "@fern-api/ui-core-utils";
import {
  getApiKeyInjectionEdgeConfig,
  getAuthEdgeConfig,
} from "@fern-docs/edge-config";

export const runtime = "edge";

export async function GET(
  req: NextRequest
): Promise<NextResponse<APIKeyInjectionConfig>> {
  if (isLocal() || isSelfHosted()) {
    return NextResponse.json({
      enabled: false,
      returnToQueryParam: "",
    });
  }

  const domain = getDocsDomainEdge(req);
  const host = req.nextUrl.host;
  const cookieJar = await cookies();

  const authEdgeConfig = await getAuthEdgeConfig(domain);
  const apiKeyEdgeConfig = await getApiKeyInjectionEdgeConfig(domain);
  const edgeConfig = authEdgeConfig || apiKeyEdgeConfig;

  const returnToQueryParam = getReturnToQueryParam(edgeConfig);

  // fern_token should be set for JWT auto-populate api key
  const fern_token_cookie = cookieJar.get("fern_token")?.value;
  const fern_token = fernToken_admin();
  const access_token = cookieJar.get("access_token")?.value;
  const refresh_token = cookieJar.get("refresh_token")?.value;
  const fernUser = await safeVerifyFernJWTConfig(
    fern_token_cookie ?? fern_token,
    edgeConfig
  );

  // if the JWT is valid, and the user has an API key, return it
  if (fernUser?.api_key != null) {
    return NextResponse.json({
      enabled: true,
      authenticated: true,
      access_token: fernUser.api_key,
      returnToQueryParam,
    });
  }

  if (fernUser?.playground?.initial_state?.auth?.bearer_token) {
    return NextResponse.json({
      enabled: true,
      authenticated: true,
      access_token: fernUser.playground.initial_state.auth.bearer_token,
      returnToQueryParam,
    });
  }

  if (!edgeConfig) {
    return NextResponse.json({
      enabled: false,
      returnToQueryParam,
    });
  }

  if (
    authEdgeConfig &&
    authEdgeConfig.type === "basic_token_verification" &&
    authEdgeConfig["api-key-injection-enabled"]
  ) {
    if (!authEdgeConfig.redirect) {
      return NextResponse.json({
        enabled: false,
        returnToQueryParam,
      });
    }

    return NextResponse.json({
      enabled: true,
      authenticated: false,
      authorizationUrl: authEdgeConfig.redirect,
      returnToQueryParam,
    });
  }

  if (
    apiKeyEdgeConfig &&
    apiKeyEdgeConfig.type === "basic_token_verification"
  ) {
    if (!apiKeyEdgeConfig.redirect) {
      return NextResponse.json({
        enabled: false,
        returnToQueryParam,
      });
    }

    return NextResponse.json({
      enabled: true,
      authenticated: false,
      authorizationUrl: apiKeyEdgeConfig.redirect,
      returnToQueryParam,
    });
  }

  if (
    edgeConfig.type === "sso" ||
    edgeConfig["api-key-injection-enabled"] !== true
  ) {
    return NextResponse.json({
      enabled: false,
      returnToQueryParam,
    });
  }

  if (edgeConfig.type !== "oauth2") {
    return NextResponse.json({
      enabled: false,
      returnToQueryParam,
    });
  }

  // assume that if the edge config is set for webflow, api key injection is always enabled
  if (edgeConfig.partner === "webflow") {
    if (access_token == null) {
      const authorizationUrl = WebflowClient.authorizeURL({
        clientId: edgeConfig.clientId,
        redirectUri: edgeConfig.redirectUri,

        // note: this is not validated
        scope: (edgeConfig.scope as OauthScope | OauthScope[]) ?? [],
      });

      return NextResponse.json({
        enabled: true,
        authenticated: false,
        authorizationUrl,
        returnToQueryParam,
      });
    }

    return NextResponse.json({
      enabled: true,
      authenticated: true,
      access_token,
      returnToQueryParam,
    });
  }

  if (edgeConfig.partner === "ory") {
    const client = new OryOAuth2Client(edgeConfig);
    const tokens = await client.getOrRefreshAccessToken(
      access_token,
      refresh_token
    );

    if (tokens == null) {
      return NextResponse.json({
        enabled: true,
        authenticated: false,
        authorizationUrl: getOryAuthorizationUrl(edgeConfig, {
          redirectUri: urlJoin(
            removeTrailingSlash(
              withDefaultProtocol(preferPreview(host, domain))
            ),
            "/api/fern-docs/oauth/ory/callback"
          ),
        }),
        returnToQueryParam,
      });
    } else {
      const expires =
        tokens.exp != null ? new Date(tokens.exp * 1000) : undefined;

      let access_token = tokens.access_token;
      let refresh_token = tokens.refresh_token;
      let exp = expires;

      // TODO: i'm not sure if this is necessary because we already refresh the token in getOrRefreshAccessToken
      const token = OryAccessTokenSchema.parse(
        await client.decode(access_token)
      );
      exp = token.exp == null ? undefined : new Date(token.exp * 1000);
      // If access token is nullish or within 5 minutes of expiration, refresh it
      try {
        if (
          refresh_token &&
          exp &&
          exp < new Date(Date.now() + 1000 * 60 * 10)
        ) {
          const {
            access_token: oauth_access_token,
            refresh_token: oauth_refresh_token,
          } = await client.refreshToken(refresh_token);
          access_token = oauth_access_token;
          if (refresh_token != null) {
            refresh_token = oauth_refresh_token;
          }
        }
      } catch (error) {
        console.error(`[api-key-injection] ${JSON.stringify(error)}`);
      }

      const response = NextResponse.json<APIKeyInjectionConfig>({
        enabled: true,
        authenticated: true,
        access_token,
        returnToQueryParam,
      });

      if (access_token !== cookieJar.get("access_token")?.value) {
        cookieJar.set(
          "access_token",
          access_token,
          withSecureCookie(withDefaultProtocol(preferPreview(host, domain)), {
            expires: exp,
          })
        );
      }

      if (
        refresh_token != null &&
        refresh_token !== cookieJar.get("refresh_token")?.value
      ) {
        cookieJar.set(
          "refresh_token",
          refresh_token,
          withSecureCookie(withDefaultProtocol(preferPreview(host, domain)), {
            expires,
          })
        );
      }

      return response;
    }
  }

  return NextResponse.json({
    enabled: false,
    returnToQueryParam,
  });
}
