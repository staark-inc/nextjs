ALTER TABLE
  "subscriptions"
ADD COLUMN
  "control_version" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE "control_events" (
    "id" UUID NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "event_id" VARCHAR(160) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "sequence" BIGINT NOT NULL,
    "body_hash" CHAR(64) NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_events_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "control_events_event_id_key"
ON
  "control_events"("event_id");

CREATE INDEX
  "control_events_source_subject_sequence_idx"
ON
  "control_events"(
    "source",
    "subject",
    "sequence"
  );

CREATE INDEX
  "control_events_processed_at_idx"
ON
  "control_events"("processed_at");
