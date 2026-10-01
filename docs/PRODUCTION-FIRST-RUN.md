# Production First Run Setup

This is the greenfield production path for a new Staark Next deployment.

The goal is to prove that a client can start from an empty PostgreSQL database,
without importing fixture JSON, then build the real website through `/admin`.

## 1. Required production configuration

Production must use explicit admin credentials and a real session secret:

```env
NODE_ENV=production
ADMIN_USERNAME=site-admin
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
```

Optional client credentials may be provisioned separately:

```env
ADMIN_CLIENT_USERNAME=client
ADMIN_CLIENT_PASSWORD=replace-with-a-strong-client-password
```

For a standalone Storage v2 deployment:

```env
DATABASE_URL=postgresql://...
STAARK_DATA_SOURCE=postgres
STAARK_DATA_FALLBACK=none
STAARK_CONTENT_SOURCE=fixtures
```

`STAARK_CONTENT_SOURCE=fixtures` only prevents an unpaired deployment from
trying to use Hub transport. With `STAARK_DATA_SOURCE=postgres`, PostgreSQL is
still authoritative for Site/Page reads.

## 2. Apply database migrations

```bash
pnpm --filter @staark/starter db:migrate:deploy
```

## 3. Run First Run Setup

The first-run command creates exactly one Site and one minimal homepage. It is
greenfield-only and refuses to overwrite an existing site key.

Example for a salon:

```bash
pnpm --filter @staark/starter db:first-run -- \
  --site-key client-production \
  --name "Client Name" \
  --url "https://example.se" \
  --website-type salon \
  --theme salong \
  --locale sv-SE \
  --email hello@example.se \
  --home-title Hem
```

`websiteType` is provisioning data. It describes the product/business profile,
not the visual theme, and should not be changed by the client after provisioning.

Supported values are:

```text
business | salon | restaurant | hotel | automotive | portfolio | custom
```

## 4. Pin the runtime to the new site

Use the site key printed by First Run Setup:

```env
STAARK_SITE_KEY=client-production
STAARK_DATA_SOURCE=postgres
STAARK_DATA_FALLBACK=none
```

Restart the production process/container after changing runtime environment.

## 5. Production smoke test

Before deployment/restart:

```bash
pnpm smoke:prod
```

This checks whitespace, Blocks v2 theme contracts, theme tests, Prisma schema,
starter typecheck/tests and a full Next.js production build.

## 6. Greenfield acceptance test

After startup, verify the deployment entirely through `/admin`:

1. Login works with explicit production credentials.
2. Dashboard loads the PostgreSQL-backed Site.
3. Homepage exists and survives restart.
4. Create `/kontakt` in Pages before linking CTAs to `/kontakt`.
5. Create/edit navigation, media, SEO and forms through Admin.
6. For a salon, Services & prices is available because `websiteType=salon`.
7. Restart the app and confirm all changes persist.
8. Rebuild/redeploy and confirm the same site is still loaded by `STAARK_SITE_KEY`.

Do not use `db:import:legacy` for this greenfield test. Legacy import is only for
migrating an existing fixture/client dataset.
