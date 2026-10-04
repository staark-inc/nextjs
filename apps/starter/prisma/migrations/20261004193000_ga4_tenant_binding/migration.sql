CREATE TABLE "google_analytics_bindings" (
    "site_id" UUID NOT NULL,
    "measurement_id" VARCHAR(40) NOT NULL,
    "property_id" VARCHAR(40) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "consent_required" BOOLEAN NOT NULL DEFAULT true,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_analytics_bindings_pkey"
      PRIMARY KEY ("site_id")
);

CREATE UNIQUE INDEX
  "google_analytics_bindings_measurement_id_key"
ON
  "google_analytics_bindings"("measurement_id");

CREATE UNIQUE INDEX
  "google_analytics_bindings_property_id_key"
ON
  "google_analytics_bindings"("property_id");

ALTER TABLE
  "google_analytics_bindings"
ADD CONSTRAINT
  "google_analytics_bindings_site_id_fkey"
FOREIGN KEY
  ("site_id")
REFERENCES
  "sites"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/*
 * Backfill only legacy GA4 configurations that are unambiguous.
 *
 * If two tenants accidentally contain the same Measurement ID or Property ID,
 * neither ambiguous value is silently claimed here. It must be resolved by a
 * Staark Manager after deployment.
 */
WITH candidates AS (
  SELECT
    "id" AS "site_id",
    UPPER(
      TRIM(
        "settings" #>> '{analytics,googleAnalytics,measurementId}'
      )
    ) AS "measurement_id",
    TRIM(
      "settings" #>> '{analytics,googleAnalytics,propertyId}'
    ) AS "property_id",
    COALESCE(
      (
        "settings" #>> '{analytics,googleAnalytics,enabled}'
      )::boolean,
      false
    ) AS "enabled",
    COALESCE(
      (
        "settings" #>> '{analytics,googleAnalytics,consentRequired}'
      )::boolean,
      true
    ) AS "consent_required"
  FROM
    "sites"
  WHERE
    "settings" #>> '{analytics,googleAnalytics,measurementId}'
      ~* '^G-[A-Z0-9]+$'
    AND
    "settings" #>> '{analytics,googleAnalytics,propertyId}'
      ~ '^[0-9]+$'
),
safe_candidates AS (
  SELECT
    *,
    COUNT(*) OVER (
      PARTITION BY "measurement_id"
    ) AS "measurement_count",
    COUNT(*) OVER (
      PARTITION BY "property_id"
    ) AS "property_count"
  FROM
    candidates
)
INSERT INTO
  "google_analytics_bindings" (
    "site_id",
    "measurement_id",
    "property_id",
    "enabled",
    "consent_required",
    "verified_at",
    "updated_at"
  )
SELECT
  "site_id",
  "measurement_id",
  "property_id",
  "enabled",
  "consent_required",
  NULL,
  CURRENT_TIMESTAMP
FROM
  safe_candidates
WHERE
  "measurement_count" = 1
  AND
  "property_count" = 1;
