export type SubscriptionAccessPolicy = {
  publicAccess: boolean;
  adminAccess: boolean;
  billingWarning: boolean;
  suspended: boolean;
};

export function getSubscriptionAccessPolicy(
  status: string | null | undefined,
): SubscriptionAccessPolicy {
  const normalized =
    status?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "trialing":
    case "active":
    case "canceling":
      return {
        publicAccess: true,
        adminAccess: true,
        billingWarning: false,
        suspended: false,
      };

    case "past_due":
      return {
        publicAccess: true,
        adminAccess: true,
        billingWarning: true,
        suspended: false,
      };

    case "suspended":
    case "unpaid":
    case "paused":
      return {
        publicAccess: false,
        adminAccess: true,
        billingWarning: true,
        suspended: true,
      };

    case "incomplete":
      return {
        publicAccess: false,
        adminAccess: true,
        billingWarning: true,
        suspended: false,
      };

    case "canceled":
    case "incomplete_expired":
    default:
      return {
        publicAccess: false,
        adminAccess: true,
        billingWarning: false,
        suspended: true,
      };
  }
}

export function hasPublicSubscriptionAccess(
  status: string | null | undefined,
): boolean {
  return getSubscriptionAccessPolicy(
    status,
  ).publicAccess;
}

export function hasAdminSubscriptionAccess(
  status: string | null | undefined,
): boolean {
  return getSubscriptionAccessPolicy(
    status,
  ).adminAccess;
}

export function hasSubscriptionBillingWarning(
  status: string | null | undefined,
): boolean {
  return getSubscriptionAccessPolicy(
    status,
  ).billingWarning;
}
