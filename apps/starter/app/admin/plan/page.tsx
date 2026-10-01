import { readAdminPlanSummary } from "@/lib/admin-plan";
import BillingPortalButton from "./BillingPortalButton";

export const dynamic = "force-dynamic";

const USAGE_ENTITLEMENTS = new Set([
  "storageBytes",
  "maxPages",
  "maxUsers",
  "maxDomains",
]);

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

function entitlementNumber(
  entitlements: Record<string, unknown>,
  key: string,
): number | null {
  const value = entitlements[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function featureLabel(key: string): string {
  const labels: Record<string, string> = {
    maxForms: "Forms",
    bookingEnabled: "Bookings",
    crmEnabled: "CRM",
  };

  return (
    labels[key] ??
    key
      .replace(/^max/, "")
      .replace(/Enabled$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (char) => char.toUpperCase())
  );
}

function displayEntitlement(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("sv-SE").format(value);
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function usageValue(current: number, limit: number | null): string {
  return limit === null ? String(current) : `${current} / ${limit}`;
}

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (["active", "trialing"].includes(normalized)) return "success";
  if (["past_due", "unpaid", "incomplete"].includes(normalized)) return "warning";
  return "muted";
}

export default async function PlanPage() {
  const plan = await readAdminPlanSummary();

  const storageLimitBytes = entitlementNumber(plan.entitlements, "storageBytes");
  const maxPages = entitlementNumber(plan.entitlements, "maxPages");
  const maxUsers = entitlementNumber(plan.entitlements, "maxUsers");
  const maxDomains = entitlementNumber(plan.entitlements, "maxDomains");

  const storagePercent =
    storageLimitBytes && storageLimitBytes > 0
      ? Math.min(
          100,
          Math.round((plan.storageUsedBytes / storageLimitBytes) * 100),
        )
      : null;

  const annualBilling = plan.billingInterval === "yearly";
  const displayedPrice = annualBilling
    ? plan.yearlyPriceCents
    : plan.monthlyPriceCents;
  const billingSuffix = annualBilling ? "/ year" : "/ month";

  const renewalLabel = plan.cancelAtPeriodEnd
    ? "Access until"
    : "Renews";
  const renewalDate = plan.currentPeriodEnd;

  const packageFeatures = Object.entries(plan.entitlements).filter(
    ([key]) => !USAGE_ENTITLEMENTS.has(key),
  );

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">Account</p>
          <h1 className="sa-h1">Plan & usage</h1>
          <p className="sa-subtitle">
            Your package, billing cycle and live website usage in one place.
          </p>
        </div>

        <span
          className={`sa-plan-status sa-plan-status--${statusTone(
            plan.subscriptionStatus,
          )}`}
        >
          {plan.subscriptionStatus}
        </span>
      </div>

      <section className="sa-plan-hero">
        <div className="sa-plan-hero__main">
          <div className="sa-plan-hero__eyebrow-row">
            <p className="sa-plan-kicker">Current package</p>
            <span className="sa-plan-key">{plan.planKey}</span>
          </div>

          <div className="sa-plan-title-row">
            <div>
              <h2>{plan.planName}</h2>
              <p>{plan.description || "Your current Staark website package."}</p>
            </div>

            <div className="sa-plan-price">
              <strong>{formatPrice(displayedPrice, plan.currency)}</strong>
              <span>{billingSuffix}</span>
            </div>
          </div>

          <div className="sa-plan-meta">
            <div>
              <span>Billing cycle</span>
              <strong>{annualBilling ? "Yearly" : "Monthly"}</strong>
            </div>
            <div>
              <span>{renewalLabel}</span>
              <strong>{formatDate(renewalDate)}</strong>
            </div>
            <div>
              <span>Cancellation</span>
              <strong>
                {plan.canceledAt
                  ? `Canceled ${formatDate(plan.canceledAt)}`
                  : plan.cancelAtPeriodEnd
                    ? "Scheduled"
                    : "Not scheduled"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="sa-plan-section-heading">
        <div>
          <p className="sa-card__eyebrow">Live usage</p>
          <h2>Resource usage</h2>
        </div>
        <span className="sa-note">
          Counts are scoped to this website and organization.
        </span>
      </div>

      <div className="sa-plan-usage-grid">
        <article className="sa-plan-usage-card sa-plan-usage-card--storage">
          <div className="sa-plan-usage-card__top">
            <span>Storage</span>
            <strong>{storagePercent === null ? "—" : `${storagePercent}%`}</strong>
          </div>
          <p className="sa-plan-usage-card__value">
            {formatBytes(plan.storageUsedBytes)}
            {storageLimitBytes ? ` / ${formatBytes(storageLimitBytes)}` : ""}
          </p>
          <div className="sa-plan-progress" aria-label="Storage usage">
            <span style={{ width: `${storagePercent ?? 0}%` }} />
          </div>
          <small>Uploaded website assets</small>
        </article>

        <article className="sa-plan-usage-card">
          <span>Pages</span>
          <strong>{usageValue(plan.pagesCount, maxPages)}</strong>
          <p>Active content pages</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Media</span>
          <strong>{plan.mediaCount}</strong>
          <p>Files currently in media storage</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Users</span>
          <strong>{usageValue(plan.usersCount, maxUsers)}</strong>
          <p>Organization members</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Domains</span>
          <strong>{usageValue(plan.domainsCount, maxDomains)}</strong>
          <p>Custom domains only</p>
        </article>

        <article className="sa-plan-usage-card">
          <span>Submissions</span>
          <strong>{plan.submissionsCount}</strong>
          <p>Forms and booking entries received</p>
        </article>
      </div>

      <section className="sa-card sa-plan-entitlements">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">Included</p>
            <h2>Package features</h2>
          </div>
          <span className="sa-note">
            Capabilities and additional limits included with {plan.planName}.
          </span>
        </div>

        <div className="sa-plan-feature-grid">
          {packageFeatures.length ? (
            packageFeatures.map(([key, value]) => {
              const booleanValue = typeof value === "boolean";

              return (
                <div className="sa-plan-feature" key={key}>
                  <div>
                    <span>{featureLabel(key)}</span>
                    {!booleanValue ? (
                      <strong>{displayEntitlement(value)}</strong>
                    ) : (
                      <small>
                        {value
                          ? "Available on this package"
                          : "Not available on this package"}
                      </small>
                    )}
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
            })
          ) : (
            <p className="sa-note">No additional package features.</p>
          )}
        </div>
      </section>

      <section className="sa-plan-billing-note">
        <div>
          <p className="sa-card__eyebrow">Subscription</p>
          <strong>Billing management</strong>
          <span>
            Open the secure Stripe portal to manage invoices, payment methods,
            cancellation and available subscription changes.
          </span>
        </div>
        <BillingPortalButton />
      </section>

      {plan.trialEndsAt ? (
        <div className="sa-plan-footnote">
          Trial ends {formatDate(plan.trialEndsAt)}.
        </div>
      ) : null}
    </>
  );
}
