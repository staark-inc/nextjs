# Custom error pages

Custom Runtime has project-owned 404 and recoverable error views, plus independent
fallbacks for missing overrides, broken project configuration and root-layout errors.

Enable the new capability explicitly in the project's manifest:

```json
"overrides": { "errors": true }
```

It defaults to false and is independent of `layouts`, `components` and
`allowCustomLayouts`. Runtime health includes `errors` among enabled capabilities.

## Trusted project registry

`apps/custom-runtime/project/error-pages.tsx` maps exact project keys to bundled
components. The demo registers `CustomNotFound` and `CustomError` from
`project/error-views.tsx` for `custom-demo`. Add another project explicitly:

```tsx
import type { CustomErrorRegistry } from "@/lib/custom-errors";
import { PortfolioNotFound, PortfolioError } from "./portfolio-error-views";

export const customProjectErrorPages = {
  "portfolio-demo": { notFound: PortfolioNotFound, error: PortfolioError },
} satisfies CustomErrorRegistry;
```

The registry is a plain module without `use client`; the imported interactive
views are client-compatible components. The 404 Server Component can select
those component references, and the Client Error Boundary can use the same
registry. Each view is optional. A missing view falls back independently.
Never load TypeScript paths from a manifest or a mounted content directory.
New component code requires rebuilding the image; manifest changes are read
per request. A project never inherits another project's registered error views.

404 props contain `{ project: { key, name } }`. Error props add `reset` and
an optional bounded `reference` (the framework digest). Use `reset()` for retry
and a root link for recovery. Raw errors, messages, stack traces, manifest/addon
configuration and integration credentials are not passed to custom views.

## Recovery behavior

- `app/not-found.tsx` handles missing/draft pages and missing blog content.
- `app/error.tsx` handles uncaught errors inside the root layout's boundary.
- `app/global-error.tsx` supplies its own HTML/body and an independent standard
  view when the root layout or normal boundary cannot render.
- Root layout provides only public project identity, the errors permission and
  theme CSS variables to the client boundary. It does not resolve addons,
  integrations or SMTP while preparing error presentation.
- Broken site content or an unsupported theme falls back to project identity
  and neutral recovery colors. An unreadable/invalid manifest uses a generic
  `Webbplats` fallback; no project identity is guessed.

404 and ordinary errors use the selected project's theme tokens, with dedicated
recovery CSS. Recovery deliberately does not render custom headers, footers or
page shells, avoiding dependencies on potentially broken layouts. The default
views always have a home action; ordinary errors also offer retry. Global errors
use generic presentation because the project context may not exist.

These are presentation boundaries for pages, not replacements for API JSON error
responses. Next controls HTTP status and streaming behavior; a streamed response
may already have committed status before rendering an error boundary. The patch
does not add public crash/test routes or reveal technical error messages.

## Verify

```bash
pnpm --filter @staark/custom test
pnpm --filter @staark/custom typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime build
```

Visit a missing path such as `/missing-page`. With `errors: true`, the demo shows
its own 404. Disable the capability, or select a project key absent from the
registry, to see the standard fallback. To test an ordinary server error locally,
use a temporary malformed page content file, then restore it; do not publish a
crash endpoint. Test retry in the browser after correcting the temporary failure.

For LAN Docker testing, preserve your local port/site URL changes and rebuild:

```bash
docker compose -f compose.custom-runtime.yml -f compose.custom-http.yml up -d --build custom-runtime
```
