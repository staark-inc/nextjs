# Staark Next Platform

Staark Next Platform is a managed website platform for deploying and operating client-facing Next.js sites, centrally connected to Staark Hub while providing each deployment with its own lightweight administration interface.

It is not a generic starter template and it is not a single website. `apps/starter` is the reference deployment used to exercise the platform. Real client deployments should remain thin instances of the same shared packages rather than long-lived forks.

## Architecture

```text
                         Staark Hub
                       (control plane)
                              │
                     signed API/webhooks
                              │
                              ▼
                    Staark Next Platform
                    @staark/platform
                     │             │
              @staark/core   @staark/theme-kit
                                     │
                              @staark/theme-*
                                     │
                              client deployment
```

The monorepo keeps the responsibilities explicit:

- `@staark/core` — low-level schemas/contracts, signed Hub protocol, HMAC signing and verification, content-client primitives and shared security primitives.
- `@staark/platform` — the product-facing Next.js layer: local-admin/auth policy plus the runtime entry points for content, forms, SEO, security and revalidation. This first architecture patch exposes the boundary while existing implementations migrate incrementally.
- `@staark/theme-kit` — presets/tokens, CSS variable generation, theme composition, section registry and rendering primitives.
- `@staark/theme-*` — design and section implementations. Themes do not own platform business logic.
- `apps/starter` — reference client deployment, not the product itself.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the ownership and dependency rules.

## Staark Hub vs local `/admin`

They solve different problems and both are part of the platform.

**Staark Hub** is the central control plane for client/deployment management, pairing, monitoring, support, central configuration and future fleet-wide operations.

**Local `/admin`** is the lightweight administration interface for one deployment: pages/content, media, SEO, forms, business information, theme/preset configuration and deployment-specific settings.

The current runtime supports both local fixture content and signed Hub-backed content. Explicit synchronization rules between Hub-managed state and site-managed state are a later platform patch; this patch does not pretend that ownership problem is already solved.

## Themes and deployments

Themes share `@staark/theme-kit`. Child themes such as Salong and Gästfrihet inherit the Light theme through `parentId` and add only their industry-specific sections. Theme code is reusable package code; client content and configuration are not copied into themes.

Each client gets its own deployment. The selected theme can differ per deployment, but platform improvements should be delivered through the shared packages and a redeploy rather than by maintaining divergent client codebases.

## Hub protocol

The Hub connector uses HMAC SHA-256 signatures with timestamp/skew checks and timing-safe comparison. The site secret remains server-only. The API contract is documented in [`docs/HUB-CONTENT-API.md`](docs/HUB-CONTENT-API.md).

## Local development

```bash
pnpm install --frozen-lockfile
cp apps/starter/.env.example apps/starter/.env.local
pnpm dev
```

The reference deployment defaults to fixture content so theme and platform work can continue before Hub pairing. To use Hub content, configure `STAARK_SITE_ID`, `STAARK_SITE_SECRET` and `STAARK_CONTENT_SOURCE=hub`.

Local `/admin` keeps development convenience defaults. In production there are no fallback administrator credentials: set `ADMIN_USERNAME`, `ADMIN_PASSWORD` and an `ADMIN_SESSION_SECRET` of at least 32 characters.

## Verification

The same quality gates are used locally and in GitHub Actions:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The repository CI intentionally uses one verification job rather than a matrix of redundant jobs.

## Requirements

- Node.js 20.9+ (CI currently verifies on Node.js 22)
- pnpm 10+
- Next.js 16
- React 19

## Security baseline

- Production local-admin credentials and session secret are required configuration; development defaults never silently become production credentials.
- Every local admin data/mutation API is protected by the authenticated admin session.
- Public forms use a signed time-trap token, honeypot, same-origin check, rate limiting and a strict field whitelist.
- Hub requests and revalidation webhooks are HMAC-signed with timestamp/skew protection and timing-safe signature checks.
- Security headers include CSP, HSTS in production, `X-Content-Type-Options`, `Referrer-Policy` and related hardening.
- Site secrets are server-only and must never use `NEXT_PUBLIC_` variables.
