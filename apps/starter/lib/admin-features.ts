import type { AdminRole } from "@staark/platform/server";

export const ADMIN_FEATURES = [
  "dashboard",
  "inbox",
  "pages",
  "media",
  "navigation",
  "design",
  "seo",
  "settings",
  "booking",
  "services",
  "themes",
  "redirects",
  "health",
  "backups",
  "system",
] as const;

export type AdminFeature = (typeof ADMIN_FEATURES)[number];
export type AdminFeatureAccess = "core" | "entitlement" | "manager";

export type AdminFeatureDefinition = {
  label: string;
  access: AdminFeatureAccess;
};

export const ADMIN_FEATURE_REGISTRY: Record<AdminFeature, AdminFeatureDefinition> = {
  dashboard: { label: "Overview", access: "core" },
  inbox: { label: "Messages", access: "core" },
  pages: { label: "Pages", access: "core" },
  media: { label: "Media", access: "core" },
  navigation: { label: "Navigation", access: "core" },
  design: { label: "Design", access: "core" },
  seo: { label: "SEO", access: "core" },
  settings: { label: "Settings", access: "core" },

  // Optional client capability. The dedicated Bookings UI is added later.
  booking: { label: "Bookings", access: "entitlement" },
  services: { label: "Services", access: "core" },

  // Technical platform capabilities belong to Staark Manager.
  themes: { label: "Themes", access: "manager" },
  redirects: { label: "Redirects", access: "manager" },
  health: { label: "Site Health", access: "manager" },
  backups: { label: "Backups", access: "manager" },

  // Unknown authenticated admin routes fail closed for clients.
  system: { label: "System", access: "manager" },
};

function isAdminFeature(value: string): value is AdminFeature {
  return (ADMIN_FEATURES as readonly string[]).includes(value);
}

/**
 * Transitional standalone entitlement source.
 * Hub provisioning becomes the source of truth later.
 *
 * Example:
 *   STAARK_ENTITLEMENTS=booking
 */
export function resolveAdminEntitlements(
  env: NodeJS.ProcessEnv = process.env,
): AdminFeature[] {
  const raw = env.STAARK_ENTITLEMENTS?.trim();
  if (!raw) return [];

  const result = new Set<AdminFeature>();

  for (const token of raw.split(",")) {
    const feature = token.trim();
    if (!feature || !isAdminFeature(feature)) continue;
    if (ADMIN_FEATURE_REGISTRY[feature].access !== "entitlement") continue;
    result.add(feature);
  }

  return [...result];
}

export function canAccessAdminFeature(
  role: AdminRole,
  feature: AdminFeature,
  entitlements: readonly AdminFeature[] = [],
): boolean {
  if (role === "manager") return true;

  const definition = ADMIN_FEATURE_REGISTRY[feature];
  if (definition.access === "core") return true;
  if (definition.access === "entitlement") return entitlements.includes(feature);
  return false;
}

export function resolveAccessibleAdminFeatures(
  role: AdminRole,
  env: NodeJS.ProcessEnv = process.env,
): AdminFeature[] {
  const entitlements = resolveAdminEntitlements(env);
  return ADMIN_FEATURES.filter((feature) =>
    canAccessAdminFeature(role, feature, entitlements),
  );
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const PAGE_FEATURES: Array<[string, AdminFeature]> = [
  ["/admin/forms", "inbox"],
  ["/admin/bookings", "booking"],
  ["/admin/services", "services"],
  ["/admin/pages", "pages"],
  ["/admin/media", "media"],
  ["/admin/navigation", "navigation"],
  ["/admin/themes/studio", "themes"],
  ["/admin/themes", "design"],
  ["/admin/seo", "seo"],
  ["/admin/redirects", "redirects"],
  ["/admin/health", "health"],
  ["/admin/backups", "backups"],
  ["/admin/site", "settings"],
];

const API_FEATURES: Array<[string, AdminFeature]> = [
  ["/api/admin/forms", "inbox"],
  ["/api/admin/services", "services"],
  ["/api/admin/blocks", "pages"],
  ["/api/admin/pages", "pages"],
  ["/api/admin/media", "media"],
  ["/api/admin/navigation", "navigation"],
  ["/api/admin/themes/studio", "themes"],
  ["/api/admin/themes/config", "design"],
  ["/api/admin/themes", "themes"],
  ["/api/admin/seo", "seo"],
  ["/api/admin/redirects", "redirects"],
  ["/api/admin/health", "health"],
  ["/api/admin/backups", "backups"],
  ["/api/admin/site", "settings"],
  ["/api/admin/shell", "dashboard"],
];

export function featureForAdminPath(pathname: string): AdminFeature | null {
  if (pathname === "/admin") return "dashboard";
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/")) {
    return null;
  }

  for (const [prefix, feature] of PAGE_FEATURES) {
    if (matchesPrefix(pathname, prefix)) return feature;
  }

  for (const [prefix, feature] of API_FEATURES) {
    if (matchesPrefix(pathname, prefix)) return feature;
  }

  if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    return "system";
  }

  return null;
}
