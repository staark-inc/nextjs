import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

import { getPrismaClient } from "./db/prisma";
import { requireAdminTenantContext } from "./admin-tenant";
import {
  PlanLimitError,
  assertWithinPlanLimit,
  entitlementNumber,
} from "./plan-entitlements";
import {
  CloudflareSaasError,
  cloudflareSaasCnameTarget,
  createCloudflareCustomHostname,
  deleteCloudflareCustomHostname,
  findCloudflareCustomHostname,
  getCloudflareCustomHostname,
  type CloudflareCustomHostname,
  type CloudflareSslValidationRecord,
} from "./cloudflare-saas";

export type AdminDnsRecord = {
  purpose: "routing" | "staark" | "ownership" | "ssl";
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  status: string | null;
};

export type AdminDomain = {
  id: string;
  hostname: string;
  type: "platform" | "custom";
  verified: boolean;
  primaryDomain: boolean;
  verificationToken: string | null;
  verificationRecordName: string | null;
  verificationRecordValue: string | null;
  sslStatus: string;
  provider: string | null;
  providerHostnameId: string | null;
  providerStatus: string | null;
  providerError: string | null;
  providerLastSyncAt: string | null;
  cnameTarget: string | null;
  dnsRecords: AdminDnsRecord[];
  createdAt: string;
  updatedAt: string;
};

export type AdminDomainVerificationResult = {
  verified: boolean;
  connected: boolean;
  providerStatus: string | null;
  sslStatus: string;
  providerError: string | null;
  records: AdminDnsRecord[];
};

export type AdminDomainState = {
  domains: AdminDomain[];
  platformDomains: AdminDomain[];
  customDomains: AdminDomain[];
  customDomainLimit: number | null;
  customDomainCount: number;
  customDomainRemaining: number | null;
  canAddCustomDomain: boolean;
  planKey: string | null;
};

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

type StoredDomain = {
  id: string;
  hostname: string;
  type: string;
  verified: boolean;
  primaryDomain: boolean;
  verificationToken: string | null;
  sslStatus: string;
  provider: string | null;
  providerHostnameId: string | null;
  providerStatus: string | null;
  providerError: string | null;
  ownershipVerificationName: string | null;
  ownershipVerificationValue: string | null;
  sslValidationRecords: unknown;
  providerLastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeCustomHostname(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Enter a valid domain name.");
  }

  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/\/.*$/, "");
  value = value.replace(/\.$/, "");

  if (!value || value.length > 253 || !value.includes(".")) {
    throw new Error("Enter a valid domain name, for example example.se.");
  }

  if (value.includes(":") || value.includes("_")) {
    throw new Error("Enter the hostname only, without port or protocol.");
  }

  const labels = value.split(".");
  if (
    labels.some((label) => !label || label.length > 63 || !HOST_LABEL.test(label))
  ) {
    throw new Error("Enter a valid domain name, for example example.se.");
  }

  if (value === "staark.app" || value.endsWith(".staark.app")) {
    throw new Error(
      "staark.app addresses are platform domains and cannot be added as custom domains.",
    );
  }

  return value;
}

function parseSslValidationRecords(value: unknown): CloudflareSslValidationRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is CloudflareSslValidationRecord =>
      Boolean(item) && typeof item === "object",
  );
}

function staarkVerificationRecord(domain: StoredDomain): AdminDnsRecord | null {
  if (domain.type !== "custom" || !domain.verificationToken) return null;

  return {
    purpose: "staark",
    type: "TXT",
    name: `_staark_domainconnect.${domain.hostname}`,
    value: `staark-domainconnect=${domain.verificationToken}`,
    status: domain.verified ? "active" : "pending",
  };
}

async function hasStaarkVerificationRecord(domain: StoredDomain): Promise<boolean> {
  const record = staarkVerificationRecord(domain);
  if (!record) return false;

  try {
    const rows = await resolveTxt(record.name);
    return rows.some((parts) => parts.join("") === record.value);
  } catch {
    // DNS propagation and missing records are normal while a domain is being
    // connected. Treat them as pending instead of failing the status check.
    return false;
  }
}

function dnsRecordsForDomain(domain: StoredDomain): AdminDnsRecord[] {
  if (domain.type !== "custom") return [];

  const records: AdminDnsRecord[] = [
    {
      purpose: "routing",
      type: "CNAME",
      name: domain.hostname,
      value: cloudflareSaasCnameTarget(),
      status: domain.providerStatus,
    },
  ];

  const staarkRecord = staarkVerificationRecord(domain);
  if (staarkRecord) records.push(staarkRecord);

  if (domain.ownershipVerificationName && domain.ownershipVerificationValue) {
    records.push({
      purpose: "ownership",
      type: "TXT",
      name: domain.ownershipVerificationName,
      value: domain.ownershipVerificationValue,
      status: domain.verified ? "active" : "pending",
    });
  }

  for (const record of parseSslValidationRecords(domain.sslValidationRecords)) {
    if (record.txt_name && record.txt_value) {
      records.push({
        purpose: "ssl",
        type: "TXT",
        name: record.txt_name,
        value: record.txt_value,
        status: record.status ?? null,
      });
    } else if (record.cname && record.cname_target) {
      records.push({
        purpose: "ssl",
        type: "CNAME",
        name: record.cname,
        value: record.cname_target,
        status: record.status ?? null,
      });
    }
  }

  const seen = new Set<string>();
  return records.filter((record) => {
    const key = `${record.type}:${record.name}:${record.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function serializeDomain(domain: StoredDomain): AdminDomain {
  const dnsRecords = dnsRecordsForDomain(domain);
  const ownership = dnsRecords.find((record) => record.purpose === "ownership");

  return {
    id: domain.id,
    hostname: domain.hostname,
    type: domain.type === "custom" ? "custom" : "platform",
    verified: domain.verified,
    primaryDomain: domain.primaryDomain,
    verificationToken: domain.verificationToken,
    verificationRecordName: ownership?.name ?? null,
    verificationRecordValue: ownership?.value ?? null,
    sslStatus: domain.sslStatus,
    provider: domain.provider,
    providerHostnameId: domain.providerHostnameId,
    providerStatus: domain.providerStatus,
    providerError: domain.providerError,
    providerLastSyncAt: domain.providerLastSyncAt?.toISOString() ?? null,
    cnameTarget:
      domain.type === "custom" ? cloudflareSaasCnameTarget() : null,
    dnsRecords,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  };
}

function providerErrorMessage(hostname: CloudflareCustomHostname): string | null {
  const errors = [
    ...(hostname.verification_errors ?? []),
    ...(hostname.ssl?.validation_errors ?? [])
      .map((entry) => entry.message)
      .filter((value): value is string => Boolean(value)),
  ];
  return errors.length ? errors.join(" ").slice(0, 2000) : null;
}

function providerData(hostname: CloudflareCustomHostname) {
  const providerStatus = hostname.status ?? "pending";
  const sslStatus = hostname.ssl?.status ?? "pending";

  return {
    provider: "cloudflare",
    providerHostnameId: hostname.id,
    providerStatus,
    providerError: providerErrorMessage(hostname),
    ownershipVerificationName: hostname.ownership_verification?.name ?? null,
    ownershipVerificationValue: hostname.ownership_verification?.value ?? null,
    sslValidationRecords: JSON.parse(
      JSON.stringify(hostname.ssl?.validation_records ?? []),
    ),
    providerLastSyncAt: new Date(),
    sslStatus,
  };
}

export async function listAdminDomains(): Promise<AdminDomainState> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const rows = await prisma.domain.findMany({
    where: { siteId: tenant.siteId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const domains = rows.map((row) => serializeDomain(row as StoredDomain));
  const platformDomains = domains.filter((domain) => domain.type === "platform");
  const customDomains = domains.filter((domain) => domain.type === "custom");
  const customDomainLimit = entitlementNumber(tenant.entitlements, "maxDomains");
  const customDomainRemaining =
    customDomainLimit === null
      ? null
      : Math.max(0, customDomainLimit - customDomains.length);

  return {
    domains,
    platformDomains,
    customDomains,
    customDomainLimit,
    customDomainCount: customDomains.length,
    customDomainRemaining,
    canAddCustomDomain:
      customDomainLimit === null || customDomains.length < customDomainLimit,
    planKey: tenant.planKey,
  };
}

export async function createAdminCustomDomain(input: {
  hostname?: unknown;
}): Promise<AdminDomain> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();
  const hostname = normalizeCustomHostname(input.hostname);

  const reserved = await prisma.$transaction(async (tx) => {
    const current = await tx.domain.count({
      where: { siteId: tenant.siteId, type: "custom" },
    });

    assertWithinPlanLimit(tenant.entitlements, "maxDomains", current);

    const existing = await tx.domain.findUnique({
      where: { hostname },
      select: { id: true, siteId: true },
    });

    if (existing) {
      if (existing.siteId === tenant.siteId) {
        throw new Error("This domain is already connected to this website.");
      }
      throw new Error("This domain is already connected to another website.");
    }

    return tx.domain.create({
      data: {
        siteId: tenant.siteId,
        hostname,
        type: "custom",
        verified: false,
        primaryDomain: false,
        verificationToken: randomUUID(),
        sslStatus: "pending",
        provider: "cloudflare",
        providerStatus: "provisioning",
      },
    });
  });

  let remote: CloudflareCustomHostname | null = null;
  let createdRemote = false;

  try {
    remote = await findCloudflareCustomHostname(hostname);
    if (!remote) {
      remote = await createCloudflareCustomHostname(hostname);
      createdRemote = true;
    }

    const updated = await prisma.domain.update({
      where: { id: reserved.id },
      data: providerData(remote),
    });
    return serializeDomain(updated as StoredDomain);
  } catch (error) {
    if (createdRemote && remote?.id) {
      await deleteCloudflareCustomHostname(remote.id).catch(() => undefined);
    }
    await prisma.domain.delete({ where: { id: reserved.id } }).catch(() => undefined);
    throw error;
  }
}

async function ensureCloudflareHostname(domain: StoredDomain) {
  const prisma = getPrismaClient();

  if (!domain.verificationToken) {
    domain.verificationToken = randomUUID();
    await prisma.domain.update({
      where: { id: domain.id },
      data: { verificationToken: domain.verificationToken },
    });
  }

  if (domain.providerHostnameId) {
    return getCloudflareCustomHostname(domain.providerHostnameId);
  }

  // Existing custom domains from the pre-Cloudflare flow are adopted on the
  // first status check instead of forcing the customer to delete/re-add them.
  const remote =
    (await findCloudflareCustomHostname(domain.hostname)) ??
    (await createCloudflareCustomHostname(domain.hostname));
  await prisma.domain.update({
    where: { id: domain.id },
    data: providerData(remote),
  });
  return remote;
}

export async function checkAdminCustomDomainDns(
  id: string,
): Promise<AdminDomainVerificationResult> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const domain = (await prisma.domain.findFirst({
    where: { id, siteId: tenant.siteId, type: "custom" },
  })) as StoredDomain | null;

  if (!domain) {
    throw new Error("Custom domain not found.");
  }

  const remote = await ensureCloudflareHostname(domain);
  const current = (await prisma.domain.findUnique({
    where: { id: domain.id },
  })) as StoredDomain;
  const staarkVerified = await hasStaarkVerificationRecord(current);
  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: {
      ...providerData(remote),
      verified: staarkVerified,
    },
  });
  const serialized = serializeDomain(updated as StoredDomain);

  return {
    verified: serialized.verified,
    connected:
      serialized.verified &&
      serialized.providerStatus === "active" &&
      serialized.sslStatus === "active",
    providerStatus: serialized.providerStatus,
    sslStatus: serialized.sslStatus,
    providerError: serialized.providerError,
    records: serialized.dnsRecords,
  };
}

export async function deleteAdminCustomDomain(id: string): Promise<void> {
  const tenant = await requireAdminTenantContext();
  const prisma = getPrismaClient();

  const domain = await prisma.domain.findFirst({
    where: { id, siteId: tenant.siteId },
    select: {
      id: true,
      type: true,
      providerHostnameId: true,
    },
  });

  if (!domain) {
    throw new Error("Domain not found.");
  }
  if (domain.type !== "custom") {
    throw new Error("The included staark.app domain cannot be removed.");
  }

  if (domain.providerHostnameId) {
    await deleteCloudflareCustomHostname(domain.providerHostnameId);
  }

  await prisma.domain.delete({ where: { id: domain.id } });
}

export function domainErrorResponse(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof PlanLimitError) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "PLAN_LIMIT_REACHED",
        resource: "customDomains",
        limit: error.limit,
        current: error.current,
        error:
          error.limit === 0
            ? "Your current plan does not include a custom domain."
            : `Your current plan includes ${error.limit} custom domain${
                error.limit === 1 ? "" : "s"
              }.`,
      },
    };
  }

  if (error instanceof CloudflareSaasError) {
    console.error("[domains/cloudflare]", error);
    return {
      status: error.status >= 400 && error.status < 500 ? 502 : 503,
      body: {
        ok: false,
        code: "CLOUDFLARE_CUSTOM_HOSTNAME_ERROR",
        error: `Cloudflare could not provision this domain: ${error.message}`,
      },
    };
  }

  console.error("[domains]", error);
  return {
    status: 400,
    body: {
      ok: false,
      error: error instanceof Error ? error.message : "Domain request failed.",
    },
  };
}
