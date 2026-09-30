import { safeAdminNext } from "@staark/platform/server";
import { readAdminSiteSettings } from "@/lib/admin-site-settings";
import BrandMark from "../BrandMark";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

type SitePreview = {
  name?: string;
  tagline?: string;
  url?: string;
  navigation?: {
    primary?: Array<{ label?: string }>;
    cta?: { label?: string };
  };
  theme?: {
    preset?: string;
    overrides?: { colors?: { primary?: string; surface?: string; ink?: string } };
  };
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadSitePreview(): Promise<SitePreview | null> {
  // The login page must render even when tenant storage is unavailable.
  try {
    return await readAdminSiteSettings();
  } catch {
    return null;
  }
}

function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function websiteUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function supportEmail(): string {
  const configured = process.env.STAARK_ADMIN_SUPPORT_EMAIL?.trim();
  return configured && EMAIL.test(configured) ? configured : "support@staarkinc.com";
}

function color(value: string | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value : fallback;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeAdminNext(typeof params.next === "string" ? params.next : null);
  const expired = params.reason === "expired";

  const site = await loadSitePreview();
  const siteName = site?.name?.trim() || "";
  const host = hostOf(site?.url);
  const siteUrl = websiteUrl(site?.url);
  const adminSupportEmail = supportEmail();
  const navLabels = (site?.navigation?.primary ?? [])
    .map((item) => item.label?.trim())
    .filter((label): label is string => Boolean(label))
    .slice(0, 4);
  const ctaLabel = site?.navigation?.cta?.label?.trim();
  const colors = site?.theme?.overrides?.colors;
  const previewStyle = {
    "--preview-hero": color(colors?.ink, "#17212e"),
    "--preview-accent": color(colors?.primary, "#8fd3ff"),
  } as React.CSSProperties;

  return (
    <div className={styles.page}>
      <section className={styles.formSide}>
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <div>
            <strong>Staark Hub</strong>
            <small>Website admin</small>
          </div>
        </div>

        <LoginForm
          next={next}
          expired={expired}
          siteName={siteName}
          host={host}
          siteUrl={siteUrl}
          supportEmail={adminSupportEmail}
        />
      </section>

      {siteName ? (
        <aside className={styles.previewSide} aria-label="Your website">
          <p className={styles.previewLabel}>Your website</p>
          <div className={styles.preview} style={previewStyle} aria-hidden="true">
            <div className={styles.previewChrome}>
              <i />
              <i />
              <i />
              {host ? <span>{host}</span> : null}
            </div>
            <div className={styles.previewNav}>
              <b>{siteName}</b>
              {navLabels.length ? (
                <div>
                  {navLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.previewHero}>
              {site?.tagline ? <small>{site.tagline}</small> : null}
              <strong>{siteName}</strong>
              {ctaLabel ? <span>{ctaLabel}</span> : null}
            </div>
          </div>
          {site?.theme?.preset ? (
            <p className={styles.previewMeta}>
              Theme <b>{site.theme.preset}</b>
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
