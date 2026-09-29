# Staark Storage Architecture v2 — Phase 0 audit

This document captures the migration boundary before PostgreSQL becomes a runtime source of truth.

## Rules

1. No big-bang migration.
2. Existing `/data` and S3 objects are never deleted by the PostgreSQL foundation.
3. Packaged theme code, manifests, schemas, presets and demo fixtures remain code.
4. Mutable customer data moves to PostgreSQL incrementally.
5. Media bytes stay in filesystem/S3/MinIO; PostgreSQL stores metadata only.
6. Every tenant-owned relational model is scoped by `siteId`.
7. Prisma is infrastructure. Admin APIs and renderers must consume repositories/domain contracts, not Prisma directly.
8. A feature may switch reads/writes to PostgreSQL only after its importer and rollback/read-fallback strategy are tested.

## Current persistence map

| Current data | Current location | Target | Phase |
| --- | --- | --- | --- |
| Site settings | `content/site.json` | `Site` + transitional `Site.settings` JSONB | 1–3 |
| Pages | `content/pages/*.json` | `Page` | 1–3 |
| Page blocks | embedded in page JSON | `PageBlock` (`props` JSONB) | 1–3 |
| Page revisions | `.staark/revisions/pages/**` | `PageRevision` (`snapshot` JSONB) | 1–3 |
| Navigation | inside `site.json` | PostgreSQL, normalized later | after foundation |
| Site/page SEO | `site.json` + page JSON | PostgreSQL; page SEO starts as `Page.seo` JSONB | 1+, normalize later |
| Redirects | `.staark/redirects.json` | PostgreSQL `Redirect` | later |
| Submissions/inbox | `.staark/submissions.jsonl` + `.staark/inbox-state.json` | PostgreSQL submissions/inbox/activity | later |
| Bookings/leads | encoded in submissions + inbox state | PostgreSQL relational domain | later |
| Media metadata | `.staark/media.json` | PostgreSQL `Media` metadata | later |
| Media bytes | `public/uploads/*` via fs/S3 driver | object storage / persistent fs | stays out of DB |
| Theme Studio custom documents | `.staark/themes/*.json` | PostgreSQL customer data | later |
| Built-in themes/blocks/presets/schemas | repository | repository | stays code |
| Packaged content/demo fixtures | repository `content/**` | repository fixture/import source | stays code |
| Backups | `.staark/backups/*.json` | object storage + DB-aware backup strategy | redesign before DB cutover |
| Deployment identity / operational markers | persistent deployment state | deployment state / Hub as appropriate | not customer content |

## Important transition boundary

The existing Backup & Restore implementation snapshots logical storage paths. Once Pages/Site become PostgreSQL-owned, that backup is no longer a complete customer-data backup. Before any DB-backed admin write path is enabled, backup semantics must be updated (or the UI must clearly mark DB-backed scopes as not covered).

## Phase 1 model decisions

- `Site.id` is a database UUID tenant id.
- `Site.key` is a stable import/provisioning key and is not the same thing as the existing Hub pairing secret/id.
- `Site.settings` is transitional JSONB for mutable `site.json` fields not yet normalized. Repository code owns the mapping.
- `Page` is unique by `(siteId, path)` and includes `deletedAt` for soft-delete. This preserves revisions and makes delete/restore transactional without orphaning history.
- `PageBlock.id` preserves the existing JSON block id. Because values such as `hero` repeat across pages, the database primary key is `(pageId, id)`.
- `PageBlock.siteId` and `PageRevision.siteId` are intentionally stored even though the parent page implies the site. Composite foreign keys enforce tenant consistency at the database level.
- Block ordering is indexed but not database-unique. Reorder operations can therefore update positions safely inside one transaction; repositories normalize positions before commit.
- `PageRevision.snapshot` stores the complete page domain snapshot, including blocks, matching the current restore semantics and allowing historical restore even after block schemas evolve.
- The current max-50 revision policy remains repository behavior, not a database constraint.
