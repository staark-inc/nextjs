import { getPrismaClient } from "./db/prisma";
import { resolvePublicContentConfig } from "./content-source";
import { verifyPassword } from "./password";
import {
  resolveTenantContext,
  type TenantRequestInput,
} from "./tenant-context";

export async function resolveSaasLoginAccount(
  request: TenantRequestInput,
  username: string,
  password: string,
) {
  const config = resolvePublicContentConfig();

  // SaaS customer authentication only exists in PostgreSQL mode.
  // Legacy/local development must not initialize Prisma just to render/login
  // to the classic admin.
  if (config.source !== "postgres") {
    return null;
  }

  const tenant = await resolveTenantContext(request);
  if (!tenant?.organizationId) return null;

  const email = username.trim().toLowerCase();
  const user = await getPrismaClient().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      passwordHash: true,
      memberships: {
        where: { organizationId: tenant.organizationId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (
    !user ||
    user.status !== "active" ||
    !user.passwordHash ||
    user.memberships.length === 0
  ) {
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return null;

  return {
    username: user.email,
    role: "client" as const,
    userId: user.id,
    siteId: tenant.siteId,
    organizationId: tenant.organizationId,
  };
}
