CREATE TABLE "search_console_bindings" (
  "site_id" UUID NOT NULL,
  "site_url" VARCHAR(512) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "verified_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "search_console_bindings_pkey"
    PRIMARY KEY ("site_id"),

  CONSTRAINT "search_console_bindings_site_id_fkey"
    FOREIGN KEY ("site_id")
    REFERENCES "sites"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "search_console_bindings_site_url_key"
ON "search_console_bindings"("site_url");
