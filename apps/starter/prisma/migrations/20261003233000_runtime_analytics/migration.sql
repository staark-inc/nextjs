CREATE TABLE "analytics_daily" (
    "site_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "path" VARCHAR(1024) NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_daily_pkey"
        PRIMARY KEY ("site_id", "date", "path")
);

CREATE INDEX "analytics_daily_site_id_date_idx"
ON "analytics_daily"("site_id", "date");

ALTER TABLE "analytics_daily"
ADD CONSTRAINT "analytics_daily_site_id_fkey"
FOREIGN KEY ("site_id")
REFERENCES "sites"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
