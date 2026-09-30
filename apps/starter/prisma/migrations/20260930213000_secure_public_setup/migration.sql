ALTER TABLE "users"
  ADD COLUMN "password_hash" VARCHAR(255);

ALTER TABLE "sites"
  ADD COLUMN "setup_token_hash" VARCHAR(64),
  ADD COLUMN "setup_token_expires_at" TIMESTAMPTZ(3),
  ADD COLUMN "setup_claimed_at" TIMESTAMPTZ(3);
