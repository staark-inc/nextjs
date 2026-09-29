# Storage v2 — PHASE 7: Redirects → PostgreSQL

PHASE 7 moves mutable redirect rules from `.staark/redirects.json` to PostgreSQL when `STAARK_DATA_SOURCE=postgres`.

## Ownership

PostgreSQL mode:

- Admin Redirects CRUD reads/writes the `redirects` table.
- Public redirect lookup reads PostgreSQL by `(site_id, from_path)`.
- Page path changes create their 301 in the **same PostgreSQL transaction** as page/revision/navigation changes.
- Reversing a previous page move reconciles the old automatic rule to avoid loops.
- Manual redirect sources cannot collide with active page paths.
- Legacy `.staark/redirects.json` is retained for rollback/import and is not deleted.

Legacy mode keeps the existing file-backed behavior.

## Migration/import

Schema migration adds `redirects` with tenant FK, unique `(site_id, from_path)`, and database checks for status/source.

Existing legacy redirects are imported separately and safely:

```bash
pnpm --filter @staark/starter db:import:redirects --site-key kreator-demo
pnpm --filter @staark/starter db:import:redirects --site-key kreator-demo --write
```

Dry-run is the default. Import is idempotent and does not prune PostgreSQL-only rules.

## Public runtime

Next.js 16 Proxy uses the Node.js runtime. Public lookup remains in `proxy.ts` so configured 301/302 status codes remain exact. PostgreSQL lookup is a unique indexed lookup; rules are not scanned.

## Rollback

Switching `STAARK_DATA_SOURCE=legacy` returns redirect reads/writes to `.staark/redirects.json`. PostgreSQL rows remain untouched.
