# Staark Storage v2 — PHASE 5: Admin Pages on PostgreSQL

PHASE 5 moves the mutable Admin Pages workflow onto the same PostgreSQL source
used by the PHASE 4 public renderer.

## Scope

When `STAARK_DATA_SOURCE=postgres`:

- Admin Pages list reads `Site` + active `Page` rows from PostgreSQL.
- New pages write `Page` + `PageBlock` rows through repositories.
- Page edits create a `before-save` revision and replace page/blocks in one DB transaction.
- Page path changes also rewrite matching primary/footer/footer-column/CTA navigation references in the same DB transaction.
- Page delete creates a `before-delete` revision, soft-deletes the page, and removes matching navigation references from `Site.settings`, all in one DB transaction.
- Revision history reads `PageRevision` from PostgreSQL.
- Revision restore creates `before-restore` and restores/reactivates the page in one DB transaction.
- Admin writes never fall back to JSON. A DB outage fails the write instead of creating split-brain state.

When `STAARK_DATA_SOURCE=legacy`, the existing JSON / storage-driver behavior remains unchanged.

## Admin page identity during migration

The current Admin UI/API calls the route parameter `file`. In PostgreSQL mode the
same compatibility field contains the stable `Page.id` UUID. It is no longer a
JSON filename.

This deliberately avoids adding a legacy filename column to the relational
model. Page URLs may change while the Admin identity stays stable.

## Navigation

Navigation is not normalized into its own tables yet. During PHASE 5 it remains
inside transitional `Site.settings` JSONB, but page create/delete updates that
JSONB through `SiteRepository` inside the same transaction as the page mutation.

## Redirect boundary

Redirects remain legacy-owned (`.staark/redirects.json`) until their dedicated
Storage v2 phase.

When an Admin page path changes:

1. revision + page replacement commit atomically in PostgreSQL;
2. the existing redirect helper is called after commit;
3. redirect failure is returned as `redirectWarning` and logged, but does not
   falsely report the committed page save as failed.

This is intentionally not presented as a cross-store transaction.

## Backup safety

Backup package v1 only snapshots the legacy/object-storage scopes. It does not
contain PostgreSQL Site/Page/PageBlock/PageRevision data.

Therefore backup creation and restore are explicitly disabled while
`STAARK_DATA_SOURCE=postgres`. Existing backup packages can still be listed or
downloaded, but recovery writes are blocked until a DB-aware backup format is
implemented.

## Rollback

Set:

```bash
STAARK_DATA_SOURCE=legacy
```

and restart the app. The legacy Admin Pages path is still present. Note that
changes made after the PostgreSQL cutover are not dual-written back to JSON.
Rollback is therefore a runtime escape hatch, not a data synchronization
mechanism.

## Verification checklist

1. `pnpm --filter @staark/starter db:generate`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. With PostgreSQL mode enabled, open `/admin/pages`.
6. Create a page and verify it appears publicly immediately.
7. Edit title/content and save; verify one `before-save` revision appears.
8. Change the path; verify public old/new paths and redirect behavior.
9. Restore a revision and verify the previous current version is retained.
10. Delete a page; verify public 404, navigation cleanup, and retained revisions.
11. Verify Backup/Restore creation/restore refuses with the PostgreSQL safety message.
