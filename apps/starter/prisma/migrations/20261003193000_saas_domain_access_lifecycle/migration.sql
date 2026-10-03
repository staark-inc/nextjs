ALTER TABLE "domains"
ADD COLUMN "blocked_at" TIMESTAMPTZ(3),
ADD COLUMN "release_at" TIMESTAMPTZ(3),
ADD COLUMN "released_at" TIMESTAMPTZ(3);

CREATE INDEX "domains_release_at_idx"
ON "domains" ("release_at");
