"use server";

import * as auth0Management from "@/app/services/auth0/management";

import { getCurrentSessionOrThrow } from "../services/auth0/getCurrentSession";
import { Auth0OrgName, Auth0UserID } from "../services/auth0/types";

export async function removeUserFromOrg({
  userIdToRemove,
  orgName,
}: {
  userIdToRemove: Auth0UserID;
  orgName: Auth0OrgName;
}) {
  const auth0 = auth0Management.getAuth0ManagementClient();
  const session = await getCurrentSessionOrThrow();
  const userId = session.user.sub;

  await auth0Management.ensureUserBelongsToOrg(userId, orgName);

  if (userId === userIdToRemove) {
    throw new Error("User cannot remove themself");
  }

  const isFernEmployee = await auth0Management.createIsFernEmployee();

  if (!isFernEmployee(userId) && isFernEmployee(userIdToRemove)) {
    throw new Error("Non-fern-employee cannot remove fern-employee");
  }

  await auth0.organizations.deleteMembers(
    { id: await auth0Management.getOrgIdFromName(orgName) },
    { members: [userIdToRemove] }
  );

  await auth0Management.invalidateCachesAfterAddingOrRemovingOrgMember({
    orgName,
  });
}
