# Staark Next.js

Staark Next.js is the Next.js counterpart of [`staark-inc/wordpress`](https://github.com/staark-inc/wordpress).
Same idea — one first-party core package plus an S-Hub theme family — but for
sites built on **Next.js (App Router)** and driven by **Staark Hub** as the CMS.

It is a pnpm + Turborepo monorepo:

```text
.
├── packages/
│   ├── core/            # @staark/core — signed Hub client, content model,
│   │                    #   S-Hub Inbox forms, revalidation webhook, SEO, security
│   └── theme-kit/       # @staark/theme-kit — preset→CSS-var runtime + block renderer
├── themes/
│   ├── light/           # @staark/theme-light — S-Hub Light (parent theme)
│   ├── salong/          # @staark/theme-salong — S-Hub Salong (child of light)
│   └── gastfrihet/      # @staark/theme-gastfrihet — S-Hub Gästfrihet (child of light)
├── apps/
│   └── starter/         # @staark/starter — a client site wired to core + a theme
├── docs/
│   └── HUB-CONTENT-API.md  # the contract Staark Hub exposes to Next.js sites
└── scripts/
    └── sign-request.mjs    # sign a request by hand (same HMAC as the WP connector)
```

## How it maps to the WordPress stack

| WordPress | Next.js |
| --- | --- |
| `plugins/staark-core` | `@staark/core` |
| `themes/staark` (S-Hub Light) | `@staark/theme-light` |
| child themes (Salong, Bygg, Gästfrihet) | `@staark/theme-*` (extend light via `parentId`) |
| `theme.json` / `presets/*.json` | the **same** preset JSON → CSS variables |
| block patterns | React sections in the theme's `sections` registry |
| Site Editor (client edits content) | **Staark Hub** (content, active preset, token overrides) |
| signed Hub connector + S-Hub Inbox | `@staark/core` Hub client + `/api/staark/forms` |
| update channel (signed releases) | npm versions + redeploy |

The one real difference from WordPress: there is no in-app Site Editor. Content,
the active preset and per-site token overrides all live in **Staark Hub**; the
site reads them through a signed API. Theme *code* ships as npm packages.

## Content model

Staark Hub is the source of truth and serves three shapes (validated with Zod at
the edge, in `packages/core/src/schema.ts`):

- **SiteSettings** — name, brand, contact, navigation, active `theme.preset` and `theme.overrides`, SEO.
- **Page** — a path plus an ordered list of **blocks**; each block's `type` selects a theme section and `props` is validated by that section.
- **FormSubmission** — the contact/booking fields (`booking_*` included), forwarded to S-Hub Inbox.

See [`docs/HUB-CONTENT-API.md`](docs/HUB-CONTENT-API.md) for the endpoints and the
signing scheme (identical, byte-for-byte, to the WordPress connector).

## Themes & presets

A theme is a set of React **sections** plus one or more **presets**. A preset is
the same JSON format as the WordPress theme presets (`tokens.colors`,
`tokens.typography`, `tokens.radius`, `tokens.layout`, and a `components` map).
`presetToCssVars()` flattens it into `--sk-*` CSS variables on `:root`, so:

- switching the active preset (in the Hub) restyles the whole site;
- a child theme (`parentId: "light"`) reuses every parent section and adds its own.

`themes/salong` reuses S-Hub Light's hero/services/process/testimonials/cta/contact
and adds `priceList` and `gallery`, using the `salong` preset copied from the
WordPress child theme.

`themes/gastfrihet` is the same idea for guesthouses, B&Bs and small hotels: it
reuses S-Hub Light's sections and adds `rooms` (a room/accommodation listing
with price-per-night and amenities) and `amenities` (a feature grid — breakfast,
wifi, parking, ...), styled with the `gastfrihet` preset (warm cream, forest
green, brass-gold accent).

## One deploy per client

Each client site is its own deployment. The theme is chosen in
`apps/starter/staark.config.ts` (or `STAARK_THEME`); a redesign to a different
theme is a redeploy. The Hub controls all content and the active preset at runtime.

## Local development

```bash
pnpm install
cp apps/starter/.env.example apps/starter/.env.local   # defaults to fixtures + salong
pnpm dev                                                # http://localhost:3200
```

Without a Hub pairing the starter serves the **fixture** content in
`apps/starter/content/` (a demo salon site), so you can build and theme before a
site is paired. To connect a real Hub, set `STAARK_SITE_ID` / `STAARK_SITE_SECRET`
(from pairing) and `STAARK_CONTENT_SOURCE=hub`.

```bash
pnpm build       # build all packages + the starter app
pnpm typecheck    # type-check the whole workspace
pnpm test         # unit tests (signing / form tokens)
```

## Requirements

- Node.js 20.9+
- pnpm 10+
- Next.js 16, React 19

## Security

- Public forms: signed time-trap token, honeypot, same-origin check, rate limit, strict field whitelist. The site never sends mail — the Hub (S-Hub Inbox) does.
- Hub requests and the revalidation webhook are HMAC-signed both ways.
- `staarkSecurityHeaders()` sets CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` etc. in `next.config.ts`.
- The site secret is server-only (never a `NEXT_PUBLIC_` variable).
