"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  GoogleAnalytics as NextGoogleAnalytics,
} from "@next/third-parties/google";

import {
  parseStoredConsent,
  STAARK_CONSENT_STORAGE_KEY,
  type ConsentPreferences,
} from "@/lib/privacy-consent";

type Props = {
  enabled: boolean;
  measurementId?: string;
  consentRequired: boolean;
  consentVersion: string;
};

function readConsent(
  version: string,
): ConsentPreferences | null {
  try {
    return parseStoredConsent(
      window.localStorage.getItem(
        STAARK_CONSENT_STORAGE_KEY,
      ),
      version,
    );
  } catch {
    return null;
  }
}

function canLoad(
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
  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    if (
      !enabled ||
      !measurementId
    ) {
      setAllowed(false);
      return;
    }

    const updateFromStorage = () => {
      setAllowed(
        canLoad(
          consentRequired,
          readConsent(
            consentVersion,
          ),
        ),
      );
    };

    updateFromStorage();

    function onConsentChanged(
      event: Event,
    ) {
      const consent =
        (
          event as CustomEvent<
            ConsentPreferences
          >
        ).detail;

      setAllowed(
        canLoad(
          consentRequired,
          consent,
        ),
      );
    }

    window.addEventListener(
      "staark:consent-changed",
      onConsentChanged,
    );

    return () => {
      window.removeEventListener(
        "staark:consent-changed",
        onConsentChanged,
      );
    };
  }, [
    enabled,
    measurementId,
    consentRequired,
    consentVersion,
  ]);

  if (
    !enabled ||
    !measurementId ||
    !allowed
  ) {
    return null;
  }

  return (
    <NextGoogleAnalytics
      gaId={measurementId}
    />
  );
}
