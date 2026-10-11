# Custom runtime extensions and shared projects

`apps/custom-runtime` is the shared Next.js host. `packages/custom` provides
manifest validation, extension resolution and a server API client factory.
Manifests select trusted bundled code; they cannot import arbitrary packages.

## Project selection

Source precedence remains explicit manifest file, explicit project directory,
then `STAARK_CUSTOM_PROJECTS_ROOT` + `STAARK_CUSTOM_PROJECT_KEY`, then `./project`.
Both shared-root variables are required. Keys accept lowercase letters, numbers
and hyphens; the loaded manifest identity must match the selected key.

Example server layout:

```text
/srv/staark/projects/salon/staark.custom.json
/srv/staark/projects/workshop/staark.custom.json
```

Start one runtime process/container per project, pointing each at the same
code/build and its own project directory and environment. This patch does not
route multiple domains to different projects inside one process. All project
directories and manifests must be operator-controlled. Keep data/media storage
and credential environments separate for each deployment.

```bash
STAARK_CUSTOM_PROJECTS_ROOT=/srv/staark/projects \
STAARK_CUSTOM_PROJECT_KEY=salon \
pnpm --filter @staark/custom-runtime start
```

Custom React overrides, layouts, styles and extension definitions are bundled
from `apps/custom-runtime/project`. They are shared by deployments of that build;
changing TypeScript requires rebuilding. A different manifest does not load
React source from its directory.

## Modules and addons

Declare trusted implementations in `project/extensions.ts`, with stable `key`,
`kind` (`module` or `addon`), optional `requires`, optional `sections`, and optional
synchronous `create({ project, config })` service factory. Enable them per
manifest:

```json
{
  "modules": [{ "key": "project-info" }],
  "addons": [{ "key": "project-label", "config": { "label": "Salon" } }]
}
```

These properties belong inside `runtime`. The shipped implementations are small
examples, not booking/SMS products. Register real implementations in this same
catalog. Enabled unknown extensions, wrong kinds, missing dependencies,
duplicate keys, cycles and conflicting extension sections fail startup/render
validation. Disabled entries are ignored. Dependency order is resolved before
service construction. Services are constructed for each project load, with no
global project service cache. Factories should avoid external side effects;
perform API calls explicitly in application handlers instead.

`resolveCustomServices(project)` returns `extensions.services` and
`integrations`. Dependencies control ordering; factories do not automatically
receive other services. Extension sections require `theme-extensions`; project
section overrides require `components`. Composition order is base theme,
extension sections, then project overrides.

The old metadata addon registry remains available to other package consumers.
The custom app uses the explicit implementation catalog for executable behavior.

## Themes

Select `runtime.theme.family` from `light`, `salong`, `skonhet`, `el`, `kreator`,
`gastfrihet`, `byra`, `webb`, or `verkstad`. The optional `variant` must identify
an existing preset in that theme. Invalid choices fail rather than silently
falling back. Child theme parent registries and preset CSS variables are passed
through to rendering. Theme CSS is bundled with the runtime.

## API integrations

```json
{
  "integrations": [{
    "key": "crm",
    "baseUrl": "https://api.example.com/v1/",
    "tokenEnv": "CRM_API_TOKEN",
    "timeoutMs": 10000
  }]
}
```

Add this inside `runtime` and supply `CRM_API_TOKEN` in the deployment's private
environment. Never put tokens in the manifest. Integrations are HTTPS-only,
resolve Bearer credentials at invocation, enforce a timeout, reject redirects
and reject requests that leave the configured origin/base path. Non-2xx errors
report status without including the upstream body. API hosts are trusted
operator configuration; this is not a public arbitrary URL proxy.

Use the server-only services helper from a server action/route:

```ts
const project = await loadActiveCustomProject();
const services = resolveCustomServices(project);
const crm = services.integrations.get("crm");
if (!crm) throw new Error("CRM integration is disabled");
const response = await crm.request("leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Example" }),
});
```

This factory does not expose a public API proxy. Each application handler must
apply its own authentication, input validation and permissions. Provider-specific
OAuth, webhooks, retries and concrete business integrations are future adapters.
Mutating requests are not automatically retried.

## Validation

`/api/runtime/health` validates the project, extension graph and theme and lists
enabled module/addon/integration keys. It makes no upstream API calls and does
not verify credential availability until a client is invoked. Failure responses
omit filesystem paths and detailed configuration errors.

```bash
pnpm --filter @staark/custom typecheck
pnpm --filter @staark/custom test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime build
```

The homepage remains a demonstration with fixed example blocks. Connecting
project-owned content, business modules and authorized API routes is separate
application work; the extension host provides the mechanism for it.

## Project error pages

`overrides.errors` independently enables project-owned 404/error views. It defaults
to false. See [Custom error pages](CUSTOM-ERROR-PAGES.md) for registry, fallback
and recovery behavior.
