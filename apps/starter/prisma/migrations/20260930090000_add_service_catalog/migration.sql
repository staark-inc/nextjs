CREATE TABLE "service_catalogs" (
    "site_id" UUID NOT NULL,
    "document" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_catalogs_pkey" PRIMARY KEY ("site_id")
);

ALTER TABLE "service_catalogs"
ADD CONSTRAINT "service_catalogs_site_id_fkey"
FOREIGN KEY ("site_id")
REFERENCES "sites"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
