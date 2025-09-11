import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ensureUserBelongsToOrg } from "@/app/services/auth0/management";
import { ResolvedReturnType } from "@/utils/types";

import { maybeGetCurrentSession } from "../utils/maybeGetCurrentSession";
import { parseNextRequestBody } from "../utils/parseNextRequestBody";
import { orgNameValidator } from "../utils/validators";
import handler from "./handler";

export declare namespace getOrgMembers {
  export type Request = z.infer<typeof GetOrgMembersRequest>;
  export type Response = ResolvedReturnType<typeof handler>;
}

export const GetOrgMembersRequest = z.object({
  orgName: orgNameValidator,
});

export async function POST(req: NextRequest) {
  const maybeSessionData = await maybeGetCurrentSession(req);
  if (maybeSessionData.errorResponse != null) {
    return maybeSessionData.errorResponse;
  }
  const { userId } = maybeSessionData.data;

  const parsedBody = await parseNextRequestBody(req, GetOrgMembersRequest);
  if (parsedBody.errorResponse != null) {
    return parsedBody.errorResponse;
  }
  const { orgName } = parsedBody.data;

  await ensureUserBelongsToOrg(userId, orgName);

  return NextResponse.json(await handler({ userId, orgName }));
}
