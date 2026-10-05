export type SearchConsolePropertyType =
  | "domain"
  | "url-prefix";

export function normalizeSearchConsoleSiteUrl(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const raw =
    value.trim();

  if (
    /^sc-domain:[a-z0-9.-]+$/i.test(
      raw,
    )
  ) {
    return raw.toLowerCase();
  }

  try {
    const url =
      new URL(
        raw,
      );

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    url.hash =
      "";

    url.search =
      "";

    if (
      !url.pathname.endsWith(
        "/",
      )
    ) {
      url.pathname +=
        "/";
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function searchConsolePropertyType(
  siteUrl: string,
): SearchConsolePropertyType {
  return siteUrl.startsWith(
    "sc-domain:",
  )
    ? "domain"
    : "url-prefix";
}

export function searchConsoleVerificationUrl(
  siteUrl: string,
  fileName: string,
): string | null {
  if (
    searchConsolePropertyType(
      siteUrl,
    ) !== "url-prefix"
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        siteUrl,
      );

    url.pathname =
      `/${fileName}`;

    url.search =
      "";

    url.hash =
      "";

    return url.toString();
  } catch {
    return null;
  }
}
