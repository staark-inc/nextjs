# Storage v2 — PHASE 8: Submissions + Inbox + Leads → PostgreSQL

PHASE 8 moves local submission persistence and Inbox state from `.staark/submissions.jsonl` + `.staark/inbox-state.json` into PostgreSQL when `STAARK_DATA_SOURCE=postgres`.

## Model

One `Submission` model owns all three public kinds:

- `contact`
- `lead`
- `booking`

Flexible form fields and request metadata stay JSONB. Operational state is normalized into columns (`status`, `bookingStatus`, timestamps), while Inbox history is stored in `submission_activities`.

This deliberately does **not** create a second CRM/pipeline system. `lead` is first-class data now, and a future pipeline can be built on top of the same records.

## Runtime ownership

PostgreSQL mode:

- Public `/api/staark/forms` keeps the existing token, honeypot, same-origin, validation and rate-limit flow.
- `content.submitForm()` writes the accepted submission to PostgreSQL.
- The notification hook still runs only after persistence succeeds.
- `/api/admin/forms`, Messages, Bookings and shell badge counts read PostgreSQL through `admin-inbox.ts`.
- Status, booking decisions and activity notes update PostgreSQL atomically.
- Clear Inbox deletes submissions for the current Site only; activities cascade.

Legacy mode keeps the current Hub/fixture + `.staark/*` behavior.

## Import

Dry-run first:

```bash
pnpm --filter @staark/starter db:import:submissions --site-key kreator-demo
```

Write after reviewing the plan:

```bash
pnpm --filter @staark/starter db:import:submissions --site-key kreator-demo --write
```

Importer preserves the legacy `SFS-00001` references based on JSONL line position, status, booking state and visible activity history. Old CRM-only activity noise remains filtered exactly as the current Inbox does.

Legacy files are not deleted or modified.

## New submissions

PostgreSQL-created submissions use stable human-readable references like `SFS-8A7F29C31D42`; IDs are tenant-scoped by `(site_id, id)`.

## Backup warning

Storage v2 PostgreSQL backups are still a later phase. Do not treat legacy file backup/restore as a complete PostgreSQL backup.
