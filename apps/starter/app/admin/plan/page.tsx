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
          <h1 className="sa-h1">Plan</h1>
          <p className="sa-subtitle">
            Package, subscription and resource usage for this website.
          </p>
        </div>
        <span className="sa-plan-status">{plan.subscriptionStatus}</span>
      </div>

      <section className="sa-plan-hero">
        <div className="sa-plan-hero__main">
          <p className="sa-plan-kicker">Current package</p>
          <div className="sa-plan-title-row">
            <div>
              <h2>{plan.planName}</h2>
              <p>{plan.description || "Your current Staark website package."}</p>
            </div>
            <div className="sa-plan-price">
              <strong>{formatPrice(plan.monthlyPriceCents, plan.currency)}</strong>
              <span>/ month</span>
            </div>
          </div>

          <div className="sa-plan-meta">
            <div>
              <span>Billing</span>
              <strong>{plan.billingInterval}</strong>
            </div>
            <div>
              <span>Current period</span>
              <strong>
                {formatDate(plan.currentPeriodStart)} – {formatDate(plan.currentPeriodEnd)}
              </strong>
            </div>
            <div>
              <span>Cancellation</span>
              <strong>
                {plan.canceledAt
                  ? `Canceled ${formatDate(plan.canceledAt)}`
                  : plan.cancelAtPeriodEnd
                    ? "At period end"
                    : "Not scheduled"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="sa-plan-usage-grid">
        <article className="sa-plan-usage-card">
          <div className="sa-plan-usage-card__top">
            <span>Storage</span>
            <strong>{storagePercent === null ? "—" : `${storagePercent}%`}</strong>
          </div>
          <p>
            {formatBytes(plan.storageUsedBytes)}
            {storageLimitBytes ? ` of ${formatBytes(storageLimitBytes)}` : ""}
          </p>
          <div className="sa-plan-progress" aria-label="Storage usage">
            <span style={{ width: `${storagePercent ?? 0}%` }} />
          </div>
        </article>

        <article className="sa-plan-usage-card">
          <span>Pages</span>
          <strong>{plan.pagesCount}</strong>
          <p>Published content pages</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Media</span>
          <strong>{plan.mediaCount}</strong>
          <p>Uploaded assets</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Submissions</span>
          <strong>{plan.submissionsCount}</strong>
          <p>Form & booking entries</p>
        </article>
      </div>

      <section className="sa-card sa-plan-entitlements">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">Included</p>
            <h2>Package features</h2>
          </div>
          <span className="sa-note">Limits and features attached to {plan.planName}.</span>
        </div>

        <div className="sa-plan-feature-grid">
          {Object.entries(plan.entitlements).map(([key, value]) => {
            const booleanValue = typeof value === "boolean";
            const isStorage = key === "storageBytes" && typeof value === "number";

            return (
              <div className="sa-plan-feature" key={key}>
                <div>
                  <span>{labelFromKey(key)}</span>
                  <strong>
                    {isStorage
                      ? formatBytes(value)
                      : displayValue(value)}
                  </strong>
                </div>
                {booleanValue ? (
                  <span
                    className={`sa-plan-feature__badge${
                      value ? " sa-plan-feature__badge--on" : ""
                    }`}
                  >
                    {value ? "Included" : "Not included"}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {plan.trialEndsAt ? (
        <div className="sa-plan-footnote">
          Trial ends {formatDate(plan.trialEndsAt)}.
        </div>
      ) : null}
    </>
  );
}
