import {
  resolvePublicContentConfig,
} from "./content-source";

import {
  requireAdminSiteId,
} from "./admin-tenant";

/**
 * null is only valid for legacy/local fixture mode.
 *
 * PostgreSQL SaaS always receives the concrete tenant siteId.
 */
export async function resolveAdminMediaSiteId():
Promise<string | null> {
  const config =
    resolvePublicContentConfig();

  if (
    config.source !==
      "postgres"
  ) {
    return null;
  }

  return requireAdminSiteId();
}
