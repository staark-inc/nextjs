-- Staark Storage Architecture v2 — redirects.
-- Legacy .staark/redirects.json is intentionally left untouched.

CREATE TABLE "redirects" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "from_path" VARCHAR(1024) NOT NULL,
    "to" VARCHAR(2048) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(40) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "redirects_status_check" CHECK ("status" IN (301, 302)),
    CONSTRAINT "redirects_source_check" CHECK ("source" IN ('manual', 'page-path-change'))
);

CREATE UNIQUE INDEX "redirects_site_id_from_path_key"
  ON "redirects"("site_id", "from_path");
CREATE INDEX "redirects_site_id_enabled_idx"
  ON "redirects"("site_id", "enabled");

ALTER TABLE "redirects"
  ADD CONSTRAINT "redirects_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
