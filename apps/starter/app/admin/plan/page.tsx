import { readAdminPlanSummary } from "@/lib/admin-plan";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** power;
  return `${value >= 10 || power === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return "Custom";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Included" : "Not included";
  if (typeof value === "number") return new Intl.NumberFormat("sv-SE").format(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function entitlementNumber(
  entitlements: Record<string, unknown>,
  key: string,
): number | null {
  const value = entitlements[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default async function PlanPage() {
  const plan = await readAdminPlanSummary();
  const storageLimitBytes = entitlementNumber(plan.entitlements, "storageBytes");
  const storagePercent =
    storageLimitBytes && storageLimitBytes > 0
      ? Math.min(
          100,
          Math.round((plan.storageUsedBytes / storageLimitBytes) * 100),
        )
      : null;

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">Account</p>
          <h1 className="sa-h1">Plan & usage</h1>
          <p className="sa-subtitle">
            Your Staark package, subscription status and current resource usage.
          </p>
        </div>
        <div className="sa-page-context">
          <span>Status</span>
          <strong>{plan.subscriptionStatus}</strong>
        </div>
      </div>

      <div className="sa-stats sa-stats--dashboard">
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Current plan</div>
          <div className="sa-stat__value">{plan.planName}</div>
          <div className="sa-stat__desc">{plan.planKey}</div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Monthly price</div>
          <div className="sa-stat__value">
            {formatPrice(plan.monthlyPriceCents, plan.currency)}
          </div>
          <div className="sa-stat__desc">{plan.billingInterval} billing</div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Storage</div>
          <div className="sa-stat__value">
            {storagePercent === null ? formatBytes(plan.storageUsedBytes) : `${storagePercent}%`}
          </div>
          <div className="sa-stat__desc">
            {formatBytes(plan.storageUsedBytes)}
            {storageLimitBytes ? ` / ${formatBytes(storageLimitBytes)}` : ""}
          </div>
        </div>
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">Pages</div>
          <div className="sa-stat__value">{plan.pagesCount}</div>
          <div className="sa-stat__desc">
            {plan.mediaCount} media · {plan.submissionsCount} submissions
          </div>
        </div>
      </div>

      <div className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">Subscription</p>
          <h2>{plan.planName}</h2>
          {plan.description ? <p>{plan.description}</p> : null}
        </div>
        <div className="sa-form-grid sa-form-grid--2">
          <div className="sa-field">
            <label>Status</label>
            <div className="sa-note">{plan.subscriptionStatus}</div>
          </div>
          <div className="sa-field">
            <label>Current period</label>
            <div className="sa-note">
              {formatDate(plan.currentPeriodStart)} → {formatDate(plan.currentPeriodEnd)}
            </div>
          </div>
          <div className="sa-field">
            <label>Trial ends</label>
            <div className="sa-note">{formatDate(plan.trialEndsAt)}</div>
          </div>
          <div className="sa-field">
            <label>Cancellation</label>
            <div className="sa-note">
              {plan.canceledAt
                ? `Canceled ${formatDate(plan.canceledAt)}`
                : plan.cancelAtPeriodEnd
                  ? `At period end (${formatDate(plan.currentPeriodEnd)})`
                  : "Not scheduled"}
            </div>
          </div>
        </div>
      </div>

      <div className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">Included</p>
          <h2>Package limits & features</h2>
          <p>These values come directly from the plan attached to this site.</p>
        </div>
        <div className="sa-form-grid sa-form-grid--2">
          {Object.entries(plan.entitlements).map(([key, value]) => (
            <div className="sa-field" key={key}>
              <label>{labelFromKey(key)}</label>
              <div className="sa-note">{displayValue(value)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
