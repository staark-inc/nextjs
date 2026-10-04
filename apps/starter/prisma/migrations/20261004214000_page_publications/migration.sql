CREATE TABLE "page_publications" (
  "page_id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "path" VARCHAR(1024) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "page_publications_pkey"
    PRIMARY KEY ("page_id"),

  CONSTRAINT "page_publications_site_id_page_id_fkey"
    FOREIGN KEY ("site_id", "page_id")
    REFERENCES "pages"("site_id", "id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX
  "page_publications_site_id_page_id_key"
ON "page_publications"("site_id", "page_id");

CREATE UNIQUE INDEX
  "page_publications_site_id_path_key"
ON "page_publications"("site_id", "path");

CREATE INDEX
  "page_publications_site_id_published_at_idx"
ON "page_publications"("site_id", "published_at");
