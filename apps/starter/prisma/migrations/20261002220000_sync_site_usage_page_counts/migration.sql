INSERT INTO "site_usage" (
  "site_id",
  "pages_count",
  "updated_at"
)
SELECT
  sites."id",
  COUNT(pages."id")::integer,
  CURRENT_TIMESTAMP
FROM "sites" AS sites
LEFT JOIN "pages" AS pages
  ON pages."site_id" = sites."id"
 AND pages."deleted_at" IS NULL
GROUP BY sites."id"
ON CONFLICT ("site_id")
DO UPDATE SET
  "pages_count" = EXCLUDED."pages_count",
  "updated_at" = CURRENT_TIMESTAMP;
