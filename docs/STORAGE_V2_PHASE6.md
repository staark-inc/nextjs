# Storage Architecture v2 — PHASE 6

PHASE 6 moves the mutable `SiteSettings` envelope and navigation Admin workflows to the same PostgreSQL source of truth already used by the public renderer and Admin Pages.

## Runtime boundary

When `STAARK_DATA_SOURCE=postgres`:

- `/api/admin/site` reads and writes `Site.settings` through `SiteRepository`.
- `/api/admin/navigation` reads `Site.settings` and page options from PostgreSQL.
- Navigation writes update only the `navigation` subtree of the latest `Site.settings` value inside a PostgreSQL transaction.
- Theme Admin helpers read/write the same `Site.settings` source, so theme activation/config changes are visible to the public renderer immediately.
- Theme Studio apply also writes the active theme layer into PostgreSQL; custom Theme Studio documents themselves remain in legacy/object storage for their later dedicated migration.
- Theme compatibility scans active PostgreSQL pages instead of stale JSON page files.
- Admin writes never fall back to legacy JSON when PostgreSQL mode is selected.

When `STAARK_DATA_SOURCE=legacy`, existing storage-driver behavior remains available.

## What remains transitional

`Site.settings` is intentionally still JSONB. PHASE 6 does not create normalized Navigation, Contact, SEO, Brand or Theme tables. Those domains can be normalized later without leaking Prisma into routes/components.

The old `content/site.json` remains as migration/rollback material but is no longer the mutable source of truth while PostgreSQL mode is active.

Redirects, Inbox/Submissions, Services, Media metadata, custom Theme Studio documents and Backup/Restore remain on their existing storage until their dedicated phases.

## Verification

1. `git diff --check`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. Start with `STAARK_DATA_SOURCE=postgres`, `STAARK_SITE_KEY=<imported-key>` and a valid `DATABASE_URL`.
6. In `/admin/site`, change business/contact data and save; refresh and verify the value persists and public metadata/header/footer update.
7. In `/admin/navigation`, add/reorder/remove a link; verify public header/footer changes immediately.
8. Change theme preset/overrides in `/admin/themes`; verify public rendering changes without touching `content/site.json`.
9. Apply a Theme Studio theme; verify the active theme settings are visible through `/api/admin/site` and publicly.
10. Stop PostgreSQL or use an invalid `DATABASE_URL`; Admin Site/Navigation writes must fail instead of writing legacy JSON.

## Rollback

Set `STAARK_DATA_SOURCE=legacy` and restart. This switches Admin Site/Navigation/Theme reads and writes back to the legacy storage path. Changes made only after PostgreSQL cutover are not dual-written to `site.json`.
