"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  defaultConsent,
  parseStoredConsent,
  STAARK_CONSENT_STORAGE_KEY,
  type ConsentPreferences,
  type PublicPrivacySettings,
} from "@/lib/privacy-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyGoogleConsent(
  consent: ConsentPreferences,
) {
  window.gtag?.("consent", "update", {
    analytics_storage:
      consent.analytics
        ? "granted"
        : "denied",

    ad_storage:
      consent.marketing
        ? "granted"
        : "denied",

    ad_user_data:
      consent.marketing
        ? "granted"
        : "denied",

    ad_personalization:
      consent.marketing
        ? "granted"
        : "denied",
  });

  window.dispatchEvent(
    new CustomEvent(
      "staark:consent-changed",
      {
        detail: consent,
      },
    ),
  );
}

function storeConsent(
  consent: ConsentPreferences,
) {
  localStorage.setItem(
    STAARK_CONSENT_STORAGE_KEY,
    JSON.stringify(consent),
  );

  applyGoogleConsent(consent);
}

export default function CookieConsent({
  settings,
}: {
  settings: PublicPrivacySettings;
}) {
  const [ready, setReady] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [customize, setCustomize] =
    useState(false);

  const [analytics, setAnalytics] =
    useState(false);

  const [marketing, setMarketing] =
    useState(false);

  useEffect(() => {
    const stored =
      parseStoredConsent(
        localStorage.getItem(
          STAARK_CONSENT_STORAGE_KEY,
        ),
        settings.consentVersion,
      );

    if (stored) {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);

      queueMicrotask(() => {
        applyGoogleConsent(stored);
        setReady(true);

        if (
          window.location.hash ===
          "#cookie-settings"
        ) {
          setCustomize(true);
          setOpen(true);
        }
      });
    } else {
      queueMicrotask(() => {
        setOpen(
          settings.cookieBannerEnabled,
        );
        setReady(true);
      });
    }

    function openCookieSettings() {
      if (
        window.location.hash !==
        "#cookie-settings"
      ) {
        return;
      }

      const current =
        parseStoredConsent(
          localStorage.getItem(
            STAARK_CONSENT_STORAGE_KEY,
          ),
          settings.consentVersion,
        );

      if (current) {
        setAnalytics(
          current.analytics,
        );

        setMarketing(
          current.marketing,
        );
      }

      setCustomize(true);
      setOpen(true);
    }

    window.addEventListener(
      "hashchange",
      openCookieSettings,
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        openCookieSettings,
      );
    };
  }, [
    settings.consentVersion,
    settings.cookieBannerEnabled,
  ]);

  function save(
    nextAnalytics: boolean,
    nextMarketing: boolean,
  ) {
    const consent: ConsentPreferences = {
      ...defaultConsent(
        settings.consentVersion,
      ),

      analytics:
        settings.analyticsConsentEnabled
          ? nextAnalytics
          : false,

      marketing:
        settings.marketingConsentEnabled
          ? nextMarketing
          : false,
    };

    storeConsent(consent);

    setAnalytics(
      consent.analytics,
    );

    setMarketing(
      consent.marketing,
    );

    setOpen(false);
    setCustomize(false);

    if (
      window.location.hash ===
      "#cookie-settings"
    ) {
      history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }

  if (
    !ready ||
    !settings.cookieBannerEnabled ||
    !open
  ) {
    return null;
  }

  return (
    <div
      className="staark-consent"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
    >
      <div className="staark-consent__card">
        <div className="staark-consent__copy">
          <strong>
            {settings.bannerTitle}
          </strong>

          <p>
            {settings.bannerDescription}
          </p>

          <div className="staark-consent__links">
            <Link
              href={
                settings.cookiePolicyPath
              }
            >
              Cookiepolicy
            </Link>

            <Link
              href={
                settings.privacyPolicyPath
              }
            >
              Integritetspolicy
            </Link>
          </div>
        </div>

        {customize ? (
          <div className="staark-consent__preferences">
            <label>
              <span>
                <strong>
                  Nödvändiga
                </strong>

                <small>
                  Krävs för att webbplatsen
                  ska fungera.
                </small>
              </span>

              <input
                type="checkbox"
                checked
                disabled
              />
            </label>

            {settings.analyticsConsentEnabled ? (
              <label>
                <span>
                  <strong>
                    Analys
                  </strong>

                  <small>
                    Hjälper oss förstå hur
                    webbplatsen används.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) =>
                    setAnalytics(
                      event.target.checked,
                    )
                  }
                />
              </label>
            ) : null}

            {settings.marketingConsentEnabled ? (
              <label>
                <span>
                  <strong>
                    Marknadsföring
                  </strong>

                  <small>
                    Kan användas för
                    annonsering och
                    remarketing.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) =>
                    setMarketing(
                      event.target.checked,
                    )
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="staark-consent__actions">
          {customize ? (
            <>
              <button
                type="button"
                className="staark-consent__secondary"
                onClick={() =>
                  save(false, false)
                }
              >
                Avvisa valfria
              </button>

              <button
                type="button"
                className="staark-consent__primary"
                onClick={() =>
                  save(
                    analytics,
                    marketing,
                  )
                }
              >
                Spara val
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="staark-consent__secondary"
                onClick={() =>
                  save(false, false)
                }
              >
                Endast nödvändiga
              </button>

              <button
                type="button"
                className="staark-consent__secondary"
                onClick={() =>
                  setCustomize(true)
                }
              >
                Anpassa
              </button>

              <button
                type="button"
                className="staark-consent__primary"
                onClick={() =>
                  save(true, true)
                }
              >
                Acceptera alla
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
