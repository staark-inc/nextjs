export const PUBLIC_ACCESS_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "canceling",
]);

export function hasPublicSubscriptionAccess(
  status: string | null | undefined,
): boolean {
  if (!status) return false;

  return PUBLIC_ACCESS_SUBSCRIPTION_STATUSES.has(
    status.trim().toLowerCase(),
  );
}
