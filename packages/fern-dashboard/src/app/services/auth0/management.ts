/* eslint-disable turbo/no-undeclared-env-vars */
import {
  ApiResponse,
  GetInvitations200ResponseOneOfInner,
  GetMembers200ResponseOneOfInner,
  ManagementClient,
} from "auth0";

import { AsyncRedisCache } from "../redis/AsyncRedisCache";
import { RedisCacheKey, RedisCacheKeyType } from "../redis/cacheKey";
import {
  Auth0OrgID,
  Auth0OrgName,
  Auth0Organization,
  Auth0UserID,
} from "./types";

const FERN_ORG_NAME = Auth0OrgName("fern");

/****************************
 * getAuth0ManagementClient *
 ****************************/

let AUTH0_MANAGEMENT_CLIENT: ManagementClient | undefined;

export function getAuth0ManagementClient() {
  if (AUTH0_MANAGEMENT_CLIENT == null) {
    const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = process.env;

    if (AUTH0_DOMAIN == null) {
      throw new Error("AUTH0_DOMAIN is not defined");
    }
    if (AUTH0_CLIENT_ID == null) {
      throw new Error("AUTH0_CLIENT_ID is not defined");
    }
    if (AUTH0_CLIENT_SECRET == null) {
      throw new Error("AUTH0_CLIENT_SECRET is not defined");
    }

    AUTH0_MANAGEMENT_CLIENT = new ManagementClient({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      clientSecret: AUTH0_CLIENT_SECRET,
      timeoutDuration: 60_000,
    });
  }

  return AUTH0_MANAGEMENT_CLIENT;
}

/**********
 * caches *
 **********/

const ORGANIZATIONS_CACHE = new AsyncRedisCache(
  RedisCacheKeyType.ORGANIZATION,
  { ttlInSeconds: 10 }
);

const ORGANIZATION_NAME_TO_ID_CACHE = new AsyncRedisCache(
  RedisCacheKeyType.ORGANIZATION_NAME_TO_ID,
  { ttlInSeconds: 10 }
);

const ORGANIZATION_MEMBERS_CACHE = new AsyncRedisCache(
  RedisCacheKeyType.ORGANIZATION_MEMBERS,
  { ttlInSeconds: 10 }
);

const ORGANIZATION_INVITATIONS_CACHE = new AsyncRedisCache(
  RedisCacheKeyType.ORGANIZATION_INVITATIONS,
  { ttlInSeconds: 10 }
);

/**********************
 * cache invalidators *
 **********************/

export async function invalidateCachesAfterAddingOrRemovingOrgMember({
  orgName,
}: {
  orgName: Auth0OrgName;
}) {
  await ORGANIZATION_MEMBERS_CACHE.invalidate(
    RedisCacheKey.organizationMembers(orgName)
  );
}

export async function invalidateCachesAfterInvitingUserToOrg(
  orgName: Auth0OrgName
) {
  await ORGANIZATION_INVITATIONS_CACHE.invalidate(
    RedisCacheKey.organizationInvitations(orgName)
  );
}

export async function invalidateCachesAfterRescindingInvitation(
  orgName: Auth0OrgName
) {
  await ORGANIZATION_INVITATIONS_CACHE.invalidate(
    RedisCacheKey.organizationInvitations(orgName)
  );
}

/***********
 * helpers *
 ***********/

export async function getOrganization(orgName: Auth0OrgName) {
  return await ORGANIZATIONS_CACHE.get(
    RedisCacheKey.organization(orgName),
    async () => {
      const { data: organization } =
        await getAuth0ManagementClient().organizations.getByName({
          name: orgName,
        });

      return organization as Auth0Organization;
    }
  );
}

export async function getOrgIdFromName(orgName: Auth0OrgName) {
  return await ORGANIZATION_NAME_TO_ID_CACHE.get(
    RedisCacheKey.organizationNameToId(orgName),
    async () => {
      const { data: organization } =
        await getAuth0ManagementClient().organizations.getByName({
          name: orgName,
        });

      return Auth0OrgID(organization.id);
    }
  );
}

export async function getMyOrganizations(userId: Auth0UserID) {
  const { data: organizations } =
    await getAuth0ManagementClient().users.getUserOrganizations({
      id: userId,
    });

  return organizations as Auth0Organization[];
}

export async function getOrgMembers(
  orgName: Auth0OrgName,
  { includeFernEmployees }: { includeFernEmployees: boolean }
) {
  let members = await ORGANIZATION_MEMBERS_CACHE.get(
    RedisCacheKey.organizationMembers(orgName),
    async () => {
      const orgId = await getOrgIdFromName(orgName);
      return await getAllOrgMembers(orgId);
    }
  );
  if (!includeFernEmployees) {
    const isFernEmployee = await createIsFernEmployee();
    members = members.filter(
      (member) => !isFernEmployee(Auth0UserID(member.user_id))
    );
  }
  return members;
}

async function getAllOrgMembers(orgId: Auth0OrgID) {
  const members: GetMembers200ResponseOneOfInner[] = [];

  const auth0 = getAuth0ManagementClient();

  let pageIndex = 0;
  let page: ApiResponse<GetMembers200ResponseOneOfInner[]>;
  do {
    page = await auth0.organizations.getMembers({
      id: orgId,
      page: pageIndex,
      per_page: 100,
      fields: "user_id,picture,name,email,roles",
    });
    members.push(...page.data);
    pageIndex++;
  } while (
    page.data.length > 0 &&
    // the auth0 API only supports loading 1,000 users via basic pagination
    members.length < 1000
  );

  members.sort((a, b) => (a.name < b.name ? -1 : 1));

  return members;
}

export async function createIsFernEmployee(): Promise<
  (userId: Auth0UserID) => boolean
> {
  const fernOrgMembers = await getOrgMembers(FERN_ORG_NAME, {
    includeFernEmployees: true,
  });
  const fernMembers = new Set(
    fernOrgMembers.map((member) => Auth0UserID(member.user_id))
  );
  return (userId: Auth0UserID) => fernMembers.has(Auth0UserID(userId));
}

/**
 * when checking multiple userIds at once, use createIsFernEmployee
 * to avoid loading the fern org members with every check
 */
export async function isFernEmployee(userId: Auth0UserID): Promise<boolean> {
  const isFernEmployeeFunc = await createIsFernEmployee();
  return isFernEmployeeFunc(userId);
}

export async function getOrgInvitations(orgName: Auth0OrgName) {
  return await ORGANIZATION_INVITATIONS_CACHE.get(
    RedisCacheKey.organizationInvitations(orgName),
    async () => {
      const orgId = await getOrgIdFromName(orgName);
      return await getAllOrgInvitations(orgId);
    }
  );
}

async function getAllOrgInvitations(orgId: Auth0OrgID) {
  const invitations: GetInvitations200ResponseOneOfInner[] = [];

  const auth0 = getAuth0ManagementClient();

  let pageIndex = 0;
  let page: ApiResponse<GetInvitations200ResponseOneOfInner[]>;
  do {
    page = await auth0.organizations.getInvitations({
      id: orgId,
      page: pageIndex,
      per_page: 100,
    });
    invitations.push(...page.data);
    pageIndex++;
  } while (
    page.data.length > 0 &&
    // the auth0 API only supports loading 1,000 invitations via basic pagination
    invitations.length < 1000
  );

  invitations.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return invitations;
}

export async function ensureUserBelongsToOrg(
  userId: Auth0UserID,
  orgName: Auth0OrgName
) {
  if (!(await doesUserBelongsToOrg(userId, orgName))) {
    throw new Error(`User ${userId} is not in org ${orgName}`);
  }
}

export async function doesUserBelongsToOrg(
  userId: Auth0UserID,
  orgName: Auth0OrgName
) {
  // a fern employee is considered to be in every org
  if (await isFernEmployee(userId)) {
    return true;
  }
  const orgs = await getMyOrganizations(userId);
  return orgs.some((o) => o.name === orgName);
}

export async function addUserToOrg(userId: Auth0UserID, orgName: Auth0OrgName) {
  const auth0 = getAuth0ManagementClient();
  await auth0.organizations.addMembers(
    { id: await getOrgIdFromName(orgName) },
    { members: [userId] }
  );
  await invalidateCachesAfterAddingOrRemovingOrgMember({ orgName });
}

export async function getUserGithubToken(
  userId: Auth0UserID
): Promise<string | undefined> {
  const auth0 = getAuth0ManagementClient();
  const user = (await auth0.users.get({ id: userId })).data;
  return user.identities.find((identity) => identity.provider === "github")
    ?.access_token;
}
