-- Staark Storage Architecture v2 — submissions + Inbox.
-- Legacy .staark/submissions.jsonl and .staark/inbox-state.json are intentionally left untouched.

CREATE TABLE "submissions" (
    "site_id" UUID NOT NULL,
    "id" VARCHAR(80) NOT NULL,
    "form_id" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "page_url" VARCHAR(2048),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "booking_status" VARCHAR(20),
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("site_id", "id"),
    CONSTRAINT "submissions_kind_check" CHECK ("kind" IN ('contact', 'lead', 'booking')),
    CONSTRAINT "submissions_status_check" CHECK ("status" IN ('new', 'read', 'replied', 'archived')),
    CONSTRAINT "submissions_booking_status_check" CHECK (
      ("kind" = 'booking' AND "booking_status" IN ('pending', 'confirmed', 'declined')) OR
      ("kind" <> 'booking' AND "booking_status" IS NULL)
    )
);

CREATE TABLE "submission_activities" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "submission_id" VARCHAR(80) NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" VARCHAR(80) NOT NULL,
    "message" VARCHAR(500) NOT NULL,

    CONSTRAINT "submission_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "submissions_site_id_kind_status_received_at_idx"
  ON "submissions"("site_id", "kind", "status", "received_at");
CREATE INDEX "submissions_site_id_booking_status_received_at_idx"
  ON "submissions"("site_id", "booking_status", "received_at");
CREATE INDEX "submission_activities_site_id_submission_id_at_idx"
  ON "submission_activities"("site_id", "submission_id", "at");

ALTER TABLE "submissions"
  ADD CONSTRAINT "submissions_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "submission_activities"
  ADD CONSTRAINT "submission_activities_site_id_submission_id_fkey"
  FOREIGN KEY ("site_id", "submission_id") REFERENCES "submissions"("site_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
