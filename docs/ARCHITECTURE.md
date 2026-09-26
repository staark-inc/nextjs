# Staark Next Platform architecture

Staark Next Platform is the reusable product layer behind independent Staark-managed Next.js client deployments. A deployment is an instance of the platform, not a fork of it.

## Ownership boundaries

### Staark Hub — control plane

Staark Hub owns cross-deployment operations: client and deployment records, pairing, central configuration, monitoring, support, and future licensing/billing or fleet-wide actions. Hub communication with a deployment uses the signed protocol in `@staark/core`.

### Local `/admin` — deployment administration

The local admin belongs to the client deployment. Its responsibility is deployment-specific website administration such as pages/content, media, SEO, forms, business information, theme/preset configuration and settings.

The two interfaces are complementary. A Hub connection must not be used as a reason to remove `/admin`, and local `/admin` must not become a second fleet control plane. Synchronization between Hub-managed and site-managed state must use explicit contracts.

## Package boundaries

```text
@staark/core
  contracts, schemas, HMAC signing/verification, Hub protocol/client primitives
        ↑
@staark/platform
  Next.js product entry point, local-admin/auth policy, forms, SEO, security,
  revalidation and runtime integration
        ↑
client deployment (apps/starter is the reference deployment)

@staark/theme-kit
  tokens, presets, CSS variables, section registry and rendering primitives
        ↑
@staark/theme-*
  visual design and section implementations
```

The platform boundary is now physical as well as conceptual: Next-specific forms, revalidation, SEO and security integration live in `@staark/platform`. `@staark/core` remains responsible for schemas, signing, Hub protocol and content-client primitives. Client-deployment code should use `@staark/platform/server` and `@staark/platform/config` for product behavior.

Themes must not accumulate authentication, Hub synchronization, forms, SEO, security or other platform business logic.

## Client deployments

Each client gets an independent deployment with its own environment, content/configuration and selected theme. The deployment should stay thin: client-specific choices belong in configuration/content, while reusable behavior belongs in the platform or theme packages.

Platform updates propagate by updating the shared workspace/package version and redeploying the client instance. Do not copy the platform into per-client forks.

## Authentication configuration

Local development may use the built-in `admin` development credentials and development session secret. Production must provide all of:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (at least 32 characters)

`resolveAdminAuthConfig()` throws a configuration error instead of silently selecting defaults in production. Admin API routes must use the authenticated session guard; hiding the admin UI is not an authorization boundary.

## Current migration boundary

The repository keeps signed Hub communication, schemas, fixtures and content-client primitives in `@staark/core`. Next.js route handlers, SEO helpers, security headers and revalidation now belong to `@staark/platform`. Theme rendering remains in `@staark/theme-kit` and theme packages. This keeps the dependency direction explicit without changing the runtime behavior of client sites.
