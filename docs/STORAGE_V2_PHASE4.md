# Staark Storage Architecture v2 — Phase 4 public renderer cutover

PHASE 4 moves **public Site/Page reads only** behind the PostgreSQL repository
layer. It does not migrate Admin writes, forms/inbox, media, redirects or other
legacy state.

> PHASE 4 is a read-cutover verification stage, not the final authoring mode.
> While `STAARK_DATA_SOURCE=postgres`, Admin Page CRUD still writes legacy JSON,
> so those edits will not appear in PostgreSQL-backed public rendering until
> PHASE 5 migrates the write path.

## Environment boundary

The existing `STAARK_CONTENT_SOURCE` setting remains unchanged:

- `fixtures` — local/persistent legacy content
- `hub` — Staark Hub content transport

Storage v2 adds an independent read-source switch:

- `STAARK_DATA_SOURCE=legacy` — existing Hub/fixture public reads (default)
- `STAARK_DATA_SOURCE=postgres` — Site/Page public reads from PostgreSQL
- `STAARK_SITE_KEY=<key>` — stable key used by the Phase 3 importer
- `STAARK_DATA_FALLBACK=none|legacy` — optional transition fallback

`STAARK_SITE_KEY` is intentionally separate from `STAARK_SITE_ID`; the latter
belongs to Hub pairing.

Forms continue through the existing Hub/fixture transport in PHASE 4.

## Rollout

Start from an already imported and idempotency-checked site.

### 1. Legacy baseline

```bash
STAARK_DATA_SOURCE=legacy pnpm --filter @staark/starter dev
```

Check `/`, the imported secondary page, metadata and `/sitemap.xml`.

### 2. PostgreSQL with temporary legacy fallback

For a host-run dev server using the compose PostgreSQL port:

```bash
export DATABASE_URL='postgresql://staark:staark-local-dev@127.0.0.1:5433/staark?schema=public'
export STAARK_DATA_SOURCE=postgres
export STAARK_DATA_FALLBACK=legacy
export STAARK_SITE_KEY=kreator-demo
pnpm --filter @staark/starter dev
```

A fallback emits a deduplicated server warning. There should be no fallback
warnings for an import that fully covers the requested public pages.

### 3. Strict PostgreSQL

```bash
export STAARK_DATA_FALLBACK=none
pnpm --filter @staark/starter dev
```

Re-check:

- `/`
- `/setup`
- page metadata
- theme/layout rendering
- `/sitemap.xml`
- a non-existent path returns the normal 404

### 4. Rollback

No data rewrite is required:

```bash
export STAARK_DATA_SOURCE=legacy
```

Restart the app. Public reads immediately use the pre-existing Hub/fixture path.

## Docker networking

A process running on the host reaches the published database port at
`127.0.0.1:5433`.

The `web` container reaches PostgreSQL through the Compose service DNS name:

```text
postgresql://staark:<password>@db:5432/staark?schema=public
```

Do not use `127.0.0.1:5433` from inside the web container.

The existing `staark-data` volume remains untouched. Never use
`docker compose down -v` during this migration.

## PHASE 4 ownership

PostgreSQL:
- Site reads
- Page list reads
- Page reads / PageBlock reconstruction

Legacy Hub/fixture path:
- Admin Page CRUD (until PHASE 5)
- form submissions / Inbox
- redirects
- media and media metadata
- Theme Studio state
- backup/restore scopes not yet redesigned

Before PHASE 5 enables DB-backed writes, backup semantics must be updated as
called out in `STORAGE_V2.md`.
