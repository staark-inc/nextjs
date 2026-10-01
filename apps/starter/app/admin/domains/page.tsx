"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./domains.module.css";

type DnsRecord = {
  purpose: "routing" | "staark" | "ownership" | "ssl";
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  status: string | null;
};

type DomainRow = {
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
  dnsRecords: DnsRecord[];
  createdAt: string;
  updatedAt: string;
};

type DomainState = {
  domains: DomainRow[];
  platformDomains: DomainRow[];
  customDomains: DomainRow[];
  customDomainLimit: number | null;
  customDomainCount: number;
  customDomainRemaining: number | null;
  canAddCustomDomain: boolean;
  planKey: string | null;
};

type VerificationResult = {
  verified: boolean;
  connected: boolean;
  providerStatus: string | null;
  sslStatus: string;
  providerError: string | null;
  records: DnsRecord[];
};

const emptyState: DomainState = {
  domains: [],
  platformDomains: [],
  customDomains: [],
  customDomainLimit: 0,
  customDomainCount: 0,
  customDomainRemaining: 0,
  canAddCustomDomain: false,
  planKey: null,
};

function statusLabel(domain: DomainRow): string {
  if (domain.type === "platform") return "Included";
  if (domain.verified && domain.providerStatus === "active" && domain.sslStatus === "active") return "Connected";
  if (domain.verified && domain.providerStatus === "active") return "SSL pending";
  if (domain.verified) return "Routing pending";
  if (domain.providerStatus === "active") return "Staark pending";
  if (domain.providerStatus === "provisioning" || domain.providerStatus === "pending") return "Provisioning";
  return "DNS pending";
}

function statusMessage(domain: DomainRow): string {
  const staark = domain.verified
    ? "Staark verification is active."
    : "Staark verification is waiting for DNS.";
  const routing = domain.providerStatus === "active"
    ? "Cloudflare routing is active."
    : "Cloudflare routing is still provisioning.";
  const ssl = domain.sslStatus === "active"
    ? "SSL is active."
    : domain.providerStatus === "active"
      ? "SSL certificate is still pending validation."
      : "SSL will activate after routing is ready.";

  return `${staark} ${routing} ${ssl}`;
}

function limitLabel(state: DomainState): string {
  if (state.customDomainLimit === null) {
    return `${state.customDomainCount} custom`;
  }
  return `${state.customDomainCount} / ${state.customDomainLimit}`;
}

export default function DomainsPage() {
  const [state, setState] = useState<DomainState>(emptyState);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const applyState = useCallback((data: Partial<DomainState>) => {
    setState((current) => ({
      ...current,
      ...data,
      platformDomains: data.platformDomains ?? current.platformDomains,
      customDomains: data.customDomains ?? current.customDomains,
      domains: data.domains ?? current.domains,
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/domains", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      showToast(
        (data as { error?: string }).error ?? "Could not load domains.",
        false,
      );
      return;
    }

    applyState(data);
  }, [applyState, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addDomain() {
    const clean = hostname.trim();
    if (!clean || working) return;

    setWorking("create");
    const response = await fetch("/api/admin/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: clean }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      showToast(
        (data as { error?: string }).error ?? "Could not add domain.",
        false,
      );
      if ((data as { code?: string }).code === "PLAN_LIMIT_REACHED") {
        await load();
      }
      return;
    }

    applyState(data);
    setHostname("");
    showToast("Custom domain added in Cloudflare. Add the DNS records below, then check status.", true);
  }

  async function checkDns(domain: DomainRow) {
    if (working) return;

    setWorking(`check:${domain.id}`);
    const response = await fetch("/api/admin/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: domain.id }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      showToast(
        (data as { error?: string }).error ?? "Could not check DNS.",
        false,
      );
      return;
    }

    applyState(data);
    const verification = (data as { verification?: VerificationResult }).verification;

    if (verification?.connected) {
      showToast("Domain connected. Staark verification, Cloudflare routing and SSL are active.", true);
    } else if (verification) {
      const current = (data as DomainState).customDomains?.find((item) => item.id === domain.id);
      showToast(
        current
          ? statusMessage(current)
          : verification.verified
            ? "Staark verification is active. Cloudflare is still finishing routing or SSL."
            : verification.providerError ?? "Cloudflare is still waiting for DNS.",
        Boolean(verification.verified || verification.providerStatus === "active"),
      );
    } else {
      showToast(
        "Cloudflare is still waiting for DNS. Changes can take a little time to propagate.",
        false,
      );
    }
  }

  async function removeDomain(domain: DomainRow) {
    if (!confirm(`Remove ${domain.hostname} from this website?`)) return;

    setWorking(`delete:${domain.id}`);
    const response = await fetch("/api/admin/domains", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: domain.id }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      showToast(
        (data as { error?: string }).error ?? "Could not remove domain.",
        false,
      );
      return;
    }

    applyState(data);
    showToast("Domain removed.", true);
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied.`, true);
    } catch {
      showToast("Could not copy to clipboard.", false);
    }
  }

  const includedHostname =
    state.platformDomains.find((domain) => domain.primaryDomain)?.hostname ??
    state.platformDomains[0]?.hostname ??
    null;

  const planName = state.planKey
    ? state.planKey.charAt(0).toUpperCase() + state.planKey.slice(1)
    : "Current";

  const addDescription = useMemo(() => {
    if (state.customDomainLimit === 0) {
      return `${planName} includes your staark.app address. Upgrade your plan to connect a custom domain.`;
    }
    if (!state.canAddCustomDomain && state.customDomainLimit !== null) {
      return `${planName} includes ${state.customDomainLimit} custom domain${
        state.customDomainLimit === 1 ? "" : "s"
      }, and the limit is currently reached.`;
    }
    if (state.customDomainRemaining === null) {
      return "Connect another domain you own.";
    }
    return `${state.customDomainRemaining} custom domain${
      state.customDomainRemaining === 1 ? "" : "s"
    } remaining on this plan.`;
  }, [planName, state]);

  return (
    <>
      <div className="sa-page-header">
        <div>
          <p className="sa-page-eyebrow">Website</p>
          <h1 className="sa-h1">Domains</h1>
          <p className="sa-subtitle">
            Manage the address people use to reach this website.
          </p>
        </div>

        <span className={styles.planBadge}>
          {planName} · {limitLabel(state)}
        </span>
      </div>

      <section className={styles.overview}>
        <article className={`sa-card ${styles.platformCard}`}>
          <div>
            <p className="sa-card__eyebrow">Included address</p>
            <h2>{includedHostname ?? "staark.app domain"}</h2>
            <p>
              Every Staark website includes one platform address. It does not
              use your custom-domain allowance.
            </p>
          </div>
          <span className={styles.connectedBadge}>Included</span>
        </article>

        <article className={`sa-card ${styles.usageCard}`}>
          <p className="sa-card__eyebrow">Custom domains</p>
          <strong>{limitLabel(state)}</strong>
          <span>
            {state.customDomainLimit === null
              ? "No package limit"
              : state.customDomainLimit === 0
                ? "Not included in this plan"
                : `${state.customDomainRemaining ?? 0} remaining`}
          </span>
        </article>
      </section>

      <section className={`sa-card ${styles.addCard}`}>
        <div>
          <p className="sa-card__eyebrow">Connect domain</p>
          <h2>Add a custom domain</h2>
          <p>{addDescription}</p>
        </div>

        <div className={styles.addRow}>
          <input
            type="text"
            inputMode="url"
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="example.se"
            aria-label="Custom domain"
            disabled={!state.canAddCustomDomain || Boolean(working)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addDomain();
            }}
          />
          <button
            className="sa-btn sa-btn--primary"
            type="button"
            onClick={() => void addDomain()}
            disabled={
              !state.canAddCustomDomain ||
              !hostname.trim() ||
              Boolean(working)
            }
          >
            {working === "create" ? "Adding…" : "Add domain"}
          </button>
        </div>

        {!state.canAddCustomDomain ? (
          <div className={styles.limitNotice}>
            <strong>Plan limit reached</strong>
            <span>
              Your included <code>*.staark.app</code> address keeps working.
            </span>
          </div>
        ) : null}
      </section>

      <section className={`sa-card ${styles.listCard}`}>
        <div className={styles.listHeader}>
          <div>
            <p className="sa-card__eyebrow">Connected addresses</p>
            <h2>
              {state.customDomains.length} custom domain
              {state.customDomains.length === 1 ? "" : "s"}
            </h2>
          </div>
          <span className={styles.hint}>
            Point the hostname to Staark, add the Staark and provider verification
            records, then refresh until verification, routing and SSL are active.
          </span>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading domains…</div>
        ) : state.customDomains.length ? (
          <div className={styles.domainList}>
            {state.customDomains.map((domain) => (
              <article className={styles.domainCard} key={domain.id}>
                <div className={styles.domainRow}>
                  <div className={styles.domainIdentity}>
                    <span className={styles.domainIcon} aria-hidden="true">↗</span>
                    <div>
                      <strong>{domain.hostname}</strong>
                      <span>Custom domain</span>
                    </div>
                  </div>

                  <div className={styles.domainStatus}>
                    <span
                      className={
                        domain.verified
                          ? styles.statusGood
                          : styles.statusPending
                      }
                    >
                      {statusLabel(domain)}
                    </span>
                    <small>SSL: {domain.sslStatus}</small>
                  </div>

                  <div className={styles.domainActions}>
                    {!domain.verified || domain.providerStatus !== "active" || domain.sslStatus !== "active" ? (
                      <button
                        className="sa-btn sa-btn--secondary sa-btn--sm"
                        type="button"
                        onClick={() => void checkDns(domain)}
                        disabled={Boolean(working)}
                      >
                        {working === `check:${domain.id}` ? "Checking…" : "Check status"}
                      </button>
                    ) : null}

                    <button
                      className="sa-btn sa-btn--danger sa-btn--sm"
                      type="button"
                      onClick={() => void removeDomain(domain)}
                      disabled={Boolean(working)}
                    >
                      {working === `delete:${domain.id}` ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>

                <div className={styles.dnsSetup}>
                  <div className={styles.dnsSetupIntro}>
                    <span className={styles.stepBadge}>DNS</span>
                    <div>
                      <strong>Domain connection</strong>
                      <p>
                        Add the records below at the authoritative DNS provider.
                        Staark verifies the domain independently while Cloudflare handles
                        hostname ownership, routing and certificate issuance. Keep all
                        verification records while the domain is connected.
                      </p>
                    </div>
                  </div>

                  {domain.dnsRecords.length ? (
                    <div className={styles.recordsList}>
                      {domain.dnsRecords.map((record, index) => (
                        <div
                          className={styles.recordGrid}
                          key={`${record.type}:${record.name}:${record.value}:${index}`}
                        >
                          <div className={styles.recordField}>
                            <span>Purpose</span>
                            <code>{
                              record.purpose === "staark"
                                ? "Staark verification"
                                : record.purpose === "ownership"
                                  ? "Provider verification"
                                  : record.purpose === "ssl"
                                    ? "SSL validation"
                                    : "Routing"
                            }</code>
                          </div>

                          <div className={styles.recordField}>
                            <span>Type</span>
                            <code>{record.type}</code>
                          </div>

                          <div className={styles.recordField}>
                            <span>Name / host</span>
                            <div className={styles.copyRow}>
                              <code>{record.name}</code>
                              <button
                                type="button"
                                onClick={() => void copy(record.name, "Record name")}
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div className={`${styles.recordField} ${styles.recordValue}`}>
                            <span>Value / target</span>
                            <div className={styles.copyRow}>
                              <code>{record.value}</code>
                              <button
                                type="button"
                                onClick={() => void copy(record.value, "Record value")}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.dnsNote}>
                      This domain predates the Cloudflare integration. Press Check status
                      once to provision it and load its validation records.
                    </div>
                  )}

                  <div className={styles.dnsNote}>
                    For a subdomain, point it with CNAME to <code>{domain.cnameTarget ?? "customers.staark.app"}</code>.
                    For an apex/root domain, use ALIAS/ANAME or CNAME flattening if your DNS provider supports it.
                  </div>

                  {domain.providerError ? (
                    <div className={styles.providerError}>{domain.providerError}</div>
                  ) : null}

                  {!(domain.verified && domain.providerStatus === "active" && domain.sslStatus === "active") ? (
                    <div className={styles.progressPanel}>
                      <div>
                        <span className={styles.stepBadge}>Status</span>
                        <strong>{statusLabel(domain)}</strong>
                      </div>
                      <p>{statusMessage(domain)}</p>
                    </div>
                  ) : null}

                  {domain.verified && domain.providerStatus === "active" && domain.sslStatus === "active" ? (
                    <div className={styles.verifiedPanel}>
                      <div>
                        <span className={styles.stepBadge}>Connected</span>
                        <strong>Staark verification, Cloudflare routing and SSL are active</strong>
                      </div>
                      <p>The hostname is ready for production HTTPS traffic.</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">No custom domain connected</div>
            <div className="sa-empty__desc">
              {state.customDomainLimit === 0
                ? "This plan uses the included staark.app address."
                : "Add a domain above when you are ready to use your own address."}
            </div>
          </div>
        )}
      </section>

      {toast ? (
        <div
          className={`sa-toast ${
            toast.ok ? "sa-toast--success" : "sa-toast--error"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
