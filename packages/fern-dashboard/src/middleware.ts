import { type NextRequest, NextResponse } from "next/server";

import { buildErrorPageSearchParams } from "./app/error/searchParams";
import { getAuth0Client } from "./app/services/auth0/auth0";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/ingest")) {
    return applyPosthogMiddleware(req);
  }

  if (req.nextUrl.pathname.startsWith("/auth/")) {
    // doing error redirection here, even though the auth0 docs say to do it in
    // the onCallback handler in the Auth0Client contructor. this is because in
    // the onCallback handler, the error is always just "An error occured during
    // the authorization flow" vs. here we get actually useful errors
    const error = req.nextUrl.searchParams.get("error");
    if (error != null) {
      return NextResponse.redirect(
        new URL(
          "/error?" +
            buildErrorPageSearchParams(req.nextUrl.searchParams).toString(),
          req.nextUrl.origin
        )
      );
    }
    return await applyAuth0Middleware(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

async function applyAuth0Middleware(req: NextRequest): Promise<NextResponse> {
  const auth0 = await getAuth0Client();
  const authResponse = await auth0.middleware(req);

  // copied from https://github.com/auth0/nextjs-auth0/issues/1983
  if (req.nextUrl.pathname === "/auth/login") {
    // This is a workaround for this issue: https://github.com/auth0/nextjs-auth0/issues/1917
    // The auth0 middleware sets some transaction cookies that are not deleted after the login flow completes.
    // This causes stale cookies to be used in subsequent requests and eventually causes the request header to be rejected because it is too large.
    const reqCookieNames = req.cookies.getAll().map((cookie) => cookie.name);
    reqCookieNames.forEach((cookie) => {
      if (cookie.startsWith("__txn")) {
        authResponse.cookies.delete(cookie);
      }
    });
  }

  // const session = await auth0.getSession(req);

  // if (!session) {
  //   // user is not authenticated, redirect to login page
  //   return NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin));
  // }

  // // refresh the access token
  // await auth0.getAccessToken(req, authResponse);

  return authResponse;
}

const INGEST_PATH_REGEX = /^\/ingest/;

function applyPosthogMiddleware(req: NextRequest): NextResponse {
  // https://posthog.com/docs/advanced/proxy/nextjs-middleware
  const url = req.nextUrl.clone();
  const headers = new Headers(req.headers);

  const hostname = url.pathname.startsWith("/ingest/static/")
    ? "us-assets.i.posthog.com"
    : "us.i.posthog.com";

  headers.set("host", hostname);

  url.protocol = "https";
  url.hostname = hostname;
  url.port = "443";
  url.pathname = url.pathname.replace(INGEST_PATH_REGEX, "");

  return NextResponse.rewrite(url, { headers });
}
