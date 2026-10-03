import type { TenantEntitlements } from "./tenant-context";

export const PLAN_FEATURES = [
  "booking",
  "analytics",
  "searchConsole",
  "businessProfile",
  "leads",
  "reports",
  "automations",
  "crm",
  "clientManagement",
  "team",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

export type FeatureAccess = {
  feature: PlanFeature;
  enabled: boolean;
  level: string | null;
  entitlementKey: string;
};

type FeatureDefinition = {
  entitlementKey: string;
  kind: "boolean" | "level";
  disabledValues?: readonly string[];
};

export const PLAN_FEATURE_REGISTRY: Record<
  PlanFeature,
  FeatureDefinition
> = {
  booking: {
    entitlementKey: "bookingEnabled",
    kind: "boolean",
  },

  analytics: {
    entitlementKey: "analytics",
    kind: "level",
    disabledValues: ["none", "disabled"],
  },

  searchConsole: {
    entitlementKey: "searchConsole",
    kind: "level",
    disabledValues: ["none", "disabled"],
  },

  businessProfile: {
    entitlementKey: "businessProfile",
    kind: "boolean",
  },

  leads: {
    entitlementKey: "leadsEnabled",
    kind: "boolean",
  },

  reports: {
    entitlementKey: "reports",
    kind: "level",
    disabledValues: ["none", "disabled"],
  },

  automations: {
    entitlementKey: "automations",
    kind: "level",
    disabledValues: ["none", "disabled"],
  },

  crm: {
    entitlementKey: "crmEnabled",
    kind: "boolean",
  },

  clientManagement: {
    entitlementKey: "clientManagementEnabled",
    kind: "boolean",
  },

  team: {
    entitlementKey: "teamEnabled",
    kind: "boolean",
  },
};

function asLevel(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function getPlanFeatureAccess(
  entitlements: TenantEntitlements,
  feature: PlanFeature,
): FeatureAccess {
  const definition = PLAN_FEATURE_REGISTRY[feature];
  const value = entitlements[definition.entitlementKey];

  if (definition.kind === "boolean") {
    return {
      feature,
      enabled: value === true,
      level: value === true ? "enabled" : null,
      entitlementKey: definition.entitlementKey,
    };
  }

  const level = asLevel(value);
  const disabled = new Set(
    (definition.disabledValues ?? ["none", "disabled"]).map((item) =>
      item.toLowerCase(),
    ),
  );

  return {
    feature,
    enabled: Boolean(level && !disabled.has(level)),
    level:
      level && !disabled.has(level)
        ? level
        : null,
    entitlementKey: definition.entitlementKey,
  };
}

export function canUsePlanFeature(
  entitlements: TenantEntitlements,
  feature: PlanFeature,
): boolean {
  return getPlanFeatureAccess(entitlements, feature).enabled;
}

export function getPlanFeatureLevel(
  entitlements: TenantEntitlements,
  feature: PlanFeature,
): string | null {
  return getPlanFeatureAccess(entitlements, feature).level;
}

export function resolvePlanFeatureAccess(
  entitlements: TenantEntitlements,
): Record<PlanFeature, FeatureAccess> {
  return Object.fromEntries(
    PLAN_FEATURES.map((feature) => [
      feature,
      getPlanFeatureAccess(entitlements, feature),
    ]),
  ) as Record<PlanFeature, FeatureAccess>;
}
