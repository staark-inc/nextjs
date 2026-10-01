ALTER TABLE "domains"
  ALTER COLUMN "ssl_status" TYPE VARCHAR(50),
  ADD COLUMN "provider" VARCHAR(30),
  ADD COLUMN "provider_hostname_id" VARCHAR(100),
  ADD COLUMN "provider_status" VARCHAR(50),
  ADD COLUMN "provider_error" TEXT,
  ADD COLUMN "ownership_verification_name" VARCHAR(253),
  ADD COLUMN "ownership_verification_value" VARCHAR(255),
  ADD COLUMN "ssl_validation_records" JSONB,
  ADD COLUMN "provider_last_sync_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "domains_provider_hostname_id_key"
  ON "domains"("provider_hostname_id");
