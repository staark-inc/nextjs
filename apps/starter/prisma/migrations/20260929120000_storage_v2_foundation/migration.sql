-- Staark Storage Architecture v2 — PostgreSQL foundation.
-- No legacy filesystem/S3 data is deleted or modified by this migration.

CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "path" VARCHAR(1024) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "seo" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "page_blocks" (
    "site_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "id" VARCHAR(160) NOT NULL,
    "type" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "page_blocks_pkey" PRIMARY KEY ("page_id", "id")
);

CREATE TABLE "page_revisions" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sites_key_key" ON "sites"("key");
CREATE UNIQUE INDEX "pages_site_id_id_key" ON "pages"("site_id", "id");
CREATE UNIQUE INDEX "pages_site_id_path_key" ON "pages"("site_id", "path");
CREATE INDEX "pages_site_id_idx" ON "pages"("site_id");
CREATE INDEX "pages_site_id_deleted_at_idx" ON "pages"("site_id", "deleted_at");
CREATE INDEX "page_blocks_site_id_page_id_position_idx" ON "page_blocks"("site_id", "page_id", "position");
CREATE INDEX "page_revisions_site_id_page_id_created_at_idx" ON "page_revisions"("site_id", "page_id", "created_at");

ALTER TABLE "pages"
  ADD CONSTRAINT "pages_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "page_blocks"
  ADD CONSTRAINT "page_blocks_site_id_page_id_fkey"
  FOREIGN KEY ("site_id", "page_id") REFERENCES "pages"("site_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "page_revisions"
  ADD CONSTRAINT "page_revisions_site_id_page_id_fkey"
  FOREIGN KEY ("site_id", "page_id") REFERENCES "pages"("site_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
