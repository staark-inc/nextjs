-- Give existing custom domains a Staark-owned verification token.
-- New domains receive the token in application code.
UPDATE "domains"
SET "verification_token" = gen_random_uuid()::text
WHERE "type" = 'custom'
  AND "verification_token" IS NULL;
