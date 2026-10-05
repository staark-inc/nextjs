-- OPT-03: indexes aligned with runtime/admin query shapes.

-- Dashboard recent activity reads the newest revisions across one tenant.
CREATE INDEX "page_revisions_site_id_created_at_idx"
ON "page_revisions"("site_id", "created_at");

-- Inbox and Dashboard list submissions newest-first for one tenant.
CREATE INDEX "submissions_site_id_received_at_id_idx"
ON "submissions"("site_id", "received_at", "id");

-- Runtime automation dispatch filters by tenant + enabled + trigger,
-- then executes rules in creation order.
CREATE INDEX "automations_site_id_enabled_trigger_created_at_idx"
ON "automations"("site_id", "enabled", "trigger", "created_at");
