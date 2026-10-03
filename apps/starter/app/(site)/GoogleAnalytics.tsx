"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import {
  parseStoredConsent,
  STAARK_CONSENT_STORAGE_KEY,
  type ConsentPreferences,
} from "@/lib/privacy-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = {
  enabled: boolean;
  measurementId?: string;
  consentRequired: boolean;
  consentVersion: string;
};

function currentConsent(
  version: string,
): ConsentPreferences | null {
  try {
    return parseStoredConsent(
      localStorage.getItem(
        STAARK_CONSENT_STORAGE_KEY,
      ),
      version,
    );
  } catch {
    return null;
  }
}

function mayLoadAnalytics(
  consentRequired: boolean,
  consent: ConsentPreferences | null,
): boolean {
  if (!consentRequired) {
    return true;
  }

  return consent?.analytics === true;
}

export default function GoogleAnalytics({
  enabled,
  measurementId,
  consentRequired,
  consentVersion,
}: Props) {
  const pathname = usePathname();

  const initialized =
    useRef(false);

  const lastPath =
    useRef<string | null>(null);

  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    if (
      !enabled ||
      !measurementId
    ) {
      return;
    }

    const consent =
      currentConsent(
        consentVersion,
      );

    queueMicrotask(() => {
      setAllowed(
        mayLoadAnalytics(
          consentRequired,
          consent,
        ),
      );
    });

    function onConsentChanged(
      event: Event,
    ) {
      const detail =
        (
          event as CustomEvent<
            ConsentPreferences
          >
        ).detail;

      setAllowed(
        mayLoadAnalytics(
          consentRequired,
          detail,
        ),
      );
    }

    window.addEventListener(
      "staark:consent-changed",
      onConsentChanged,
    );

    return () =>
      window.removeEventListener(
        "staark:consent-changed",
        onConsentChanged,
      );
  }, [
    enabled,
    measurementId,
    consentRequired,
    consentVersion,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      !measurementId ||
      !allowed ||
      initialized.current
    ) {
      return;
    }

    window.dataLayer =
      window.dataLayer || [];

    window.gtag =
      window.gtag ||
      function gtag(
        ...args: unknown[]
      ) {
        window.dataLayer?.push(
          args,
        );
      };

    const existing =
      document.querySelector(
        `script[data-staark-ga="${measurementId}"]`,
      );

    if (!existing) {
      const script =
        document.createElement(
          "script",
        );

      script.async = true;

      script.src =
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
          measurementId,
        )}`;

      script.dataset.staarkGa =
        measurementId;

      document.head.appendChild(
        script,
      );
    }

    window.gtag(
      "js",
      new Date(),
    );

    window.gtag(
      "config",
      measurementId,
      {
        send_page_view: false,
      },
    );

    initialized.current = true;

    setAllowed(true);
  }, [
    enabled,
    measurementId,
    allowed,
  ]);

  useEffect(() => {
    if (
      !initialized.current ||
      !allowed ||
      !measurementId ||
      !pathname ||
      lastPath.current === pathname
    ) {
      return;
    }

    lastPath.current = pathname;

    window.gtag?.(
      "event",
      "page_view",
      {
        page_path: pathname,
        page_location:
          window.location.href,
        page_title:
          document.title,
      },
    );
  }, [
    pathname,
    allowed,
    measurementId,
  ]);

  return null;
}
