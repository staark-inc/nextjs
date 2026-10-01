ALTER TABLE "sites"
  ADD COLUMN "setup_completed_at" TIMESTAMPTZ(3);

-- Existing configured sites already have routable pages. Mark those complete so
-- this migration does not unexpectedly reopen the first-configuration wizard.
UPDATE "sites" AS s
SET "setup_completed_at" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "pages" AS p
  WHERE p."site_id" = s."id"
);
