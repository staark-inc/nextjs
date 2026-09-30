import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getPrismaClient } from "./db/prisma";
import {
  resolveTenantContext,
  type TenantRequestInput,
} from "./tenant-context";

export const SETUP_CLAIM_COOKIE = "staark-setup-claim";
export const SETUP_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const SETUP_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secureHashEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function createSetupToken(ttlMs = SETUP_LINK_TTL_MS) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: tokenHash(token),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export async function issueSetupClaimForSite(siteKey: string) {
  const claim = createSetupToken();
  const updated = await getPrismaClient().site.updateMany({
    where: { key: siteKey, setupCompletedAt: null },
    data: {
      setupTokenHash: claim.hash,
      setupTokenExpiresAt: claim.expiresAt,
      setupClaimedAt: null,
    },
  });

  if (updated.count !== 1) {
    throw new Error(`Cannot issue setup claim for site "${siteKey}".`);
  }

  return claim;
}

async function setupSite(input: TenantRequestInput) {
  const tenant = await resolveTenantContext(input);
  if (!tenant || tenant.source !== "domain") return null;

  const site = await getPrismaClient().site.findUnique({
    where: { id: tenant.siteId },
    select: {
      id: true,
      key: true,
      organizationId: true,
      setupCompletedAt: true,
      setupTokenHash: true,
      setupTokenExpiresAt: true,
      setupClaimedAt: true,
    },
  });

  return site ? { tenant, site } : null;
}

export async function exchangeSetupClaim(
  input: TenantRequestInput,
  token: string,
) {
  const resolved = await setupSite(input);
  if (!resolved || !token || resolved.site.setupCompletedAt) return null;

  const { site } = resolved;
  if (
    !site.setupTokenHash ||
    !site.setupTokenExpiresAt ||
    site.setupTokenExpiresAt <= new Date()
  ) {
    return null;
  }

  if (!secureHashEqual(site.setupTokenHash, tokenHash(token))) return null;

  // One-time exchange: the emailed claim token is immediately replaced by a
  // short-lived browser session token, so replaying the original URL fails.
  const session = createSetupToken(SETUP_SESSION_TTL_MS);
  const updated = await getPrismaClient().site.updateMany({
    where: {
      id: site.id,
      setupCompletedAt: null,
      setupTokenHash: site.setupTokenHash,
    },
    data: {
      setupTokenHash: session.hash,
      setupTokenExpiresAt: session.expiresAt,
      setupClaimedAt: new Date(),
    },
  });

  if (updated.count !== 1) return null;

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    siteKey: site.key,
  };
}

export async function validateSetupSession(
  input: TenantRequestInput,
  token: string | null | undefined,
) {
  if (!token) return null;

  const resolved = await setupSite(input);
  if (!resolved || resolved.site.setupCompletedAt) return null;

  const { site } = resolved;
  if (
    !site.setupClaimedAt ||
    !site.setupTokenHash ||
    !site.setupTokenExpiresAt ||
    site.setupTokenExpiresAt <= new Date()
  ) {
    return null;
  }

  if (!secureHashEqual(site.setupTokenHash, tokenHash(token))) return null;
  return { tenant: resolved.tenant, site };
}
