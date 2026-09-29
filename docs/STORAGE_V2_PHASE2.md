# Staark Storage Architecture v2 — Phase 2 repository layer

Phase 2 introduces the persistence boundary between Prisma and the rest of the
application. It does **not** switch any existing read or write path to PostgreSQL.

## Boundary

```text
PostgreSQL
  ↓
Prisma client + pg adapter
  ↓
PostgreSQL repository implementations
  ↓
Repository contracts / domain records
  ↓
Admin APIs, importer and public renderer (later phases)
```

Application code must not import generated Prisma models or `PrismaClient`
directly. PostgreSQL-specific code stays under
`apps/starter/lib/repositories/postgres` and `apps/starter/lib/db`.

## Repository contracts

Phase 2 provides three domain-facing repositories:

- `SiteRepository`
- `PageRepository`
- `RevisionRepository`

All tenant-owned operations take `siteId` explicitly.

`PageRepository` reconstructs the existing `@staark/core` `Page` domain shape
from `Page` + ordered `PageBlock` rows. Block positions are normalized from the
array order on every write.

`RevisionRepository` stores complete page snapshots, preserves an existing
legacy checksum during import when supplied, deduplicates consecutive snapshots
and keeps the current 50-revision retention policy.

## Transactions

`withPostgresTransaction()` creates repository instances bound to one Prisma
interactive transaction. Cross-repository workflows must use this boundary
instead of importing Prisma into route handlers.

A later Admin Pages write can therefore become one transaction containing, for
example:

1. create the before-save revision;
2. replace the page and its blocks;
3. write other DB-owned side effects once those domains are migrated.

## Lazy Prisma initialization

`getPrismaClient()` does not create a connection at module import time.
`DATABASE_URL` is only required when a PostgreSQL repository is actually used.

That is intentional during migration: the existing fs/S3 content runtime keeps
working until a later phase explicitly switches a feature to PostgreSQL.

## Phase 2 non-goals

This phase does not:

- import legacy JSON;
- change the public renderer;
- change Admin Pages CRUD;
- dual-write to JSON and PostgreSQL;
- change `/data`;
- move media bytes;
- change Backup & Restore semantics.

The next step is Phase 3: a dry-run-first JSON → PostgreSQL importer.
