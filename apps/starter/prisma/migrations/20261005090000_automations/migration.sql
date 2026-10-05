CREATE TABLE "automations" (
  "id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "trigger" VARCHAR(80) NOT NULL,
  "trigger_config" JSONB NOT NULL DEFAULT '{}',
  "action" VARCHAR(80) NOT NULL,
  "action_config" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automations_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "automations_site_id_fkey"
    FOREIGN KEY ("site_id")
    REFERENCES "sites"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "automations_site_id_enabled_idx"
ON "automations"("site_id", "enabled");

CREATE INDEX "automations_site_id_trigger_idx"
ON "automations"("site_id", "trigger");


CREATE TABLE "automation_runs" (
  "id" UUID NOT NULL,
  "site_id" UUID NOT NULL,
  "automation_id" UUID NOT NULL,
  "event_key" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB,
  "error" TEXT,
  "started_at" TIMESTAMPTZ(3),
  "finished_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automation_runs_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "automation_runs_site_id_fkey"
    FOREIGN KEY ("site_id")
    REFERENCES "sites"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "automation_runs_automation_id_fkey"
    FOREIGN KEY ("automation_id")
    REFERENCES "automations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "automation_runs_automation_id_event_key_key"
ON "automation_runs"("automation_id", "event_key");

CREATE INDEX "automation_runs_site_id_created_at_idx"
ON "automation_runs"("site_id", "created_at");

CREATE INDEX "automation_runs_status_created_at_idx"
ON "automation_runs"("status", "created_at");
