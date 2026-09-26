# Staark Hub → Next.js content API

This is the contract the Next.js stack (`@staark/core`) expects from Staark Hub.
It sits alongside the existing WordPress connector endpoints (`/api/hub/wordpress/*`)
and reuses the **same request signature**, so the Hub can authenticate WordPress
and Next.js sites with one code path.

## Authentication

Every request from a paired site is signed exactly like the WordPress connector
(`staark-core.php → staark_hub_connection_request`):

```
payload   = METHOD + "\n" + PATH(+query) + "\n" + TIMESTAMP + "\n" + sha256_hex(body)
signature = hmac_sha256_hex(payload, site_secret)
```

Headers on every request:

| Header | Value |
| --- | --- |
| `X-Staark-Site-ID` | the site id issued at pairing |
| `X-Staark-Timestamp` | unix seconds; reject if skew > 300s |
| `X-Staark-Signature` | hex HMAC-SHA256 of the payload |
| `X-Staark-Client` | `nextjs` |

The Next.js client sets these; the Hub verifies them. The Hub signs its
**revalidation webhook** to the site the same way (see below), and the site
verifies it with `verifySignature`.

## Endpoints the Hub must expose

All responses are JSON with a top-level `{ "ok": true, ... }` / `{ "ok": false, "error": "..." }`
envelope, matching the WordPress connector.

### `GET /api/hub/next/site`
Returns the site settings. Shape = `SiteSettingsSchema` (see `packages/core/src/schema.ts`).

```json
{ "ok": true, "site": { "name": "Salong Nova", "url": "https://…", "theme": { "preset": "salong" }, "contact": { … }, "navigation": { … }, "seo": { … } } }
```

### `GET /api/hub/next/pages`
List of page summaries for static generation and the sitemap.

```json
{ "ok": true, "pages": [ { "path": "/", "updatedAt": "2026-09-20T10:00:00Z", "noindex": false }, { "path": "/priser", … } ] }
```

### `GET /api/hub/next/page?path=/priser`
One page. Shape = `PageSchema` (a `blocks[]` array; each block's `type` maps to a
theme section and `props` is validated by that section). Return HTTP 404 with
`{ "ok": false }` for an unknown path.

```json
{ "ok": true, "page": { "path": "/priser", "title": "Priser", "seo": { … }, "blocks": [ { "id": "prices", "type": "priceList", "props": { … } } ] } }
```

### `POST /api/hub/next/forms`
A public form submission forwarded from the site (S-Hub Inbox). Body:

```json
{ "formId": "salong-bokning", "fields": { "name": "…", "email": "…", "booking_date": "2026-10-01", "booking_time": "14:00", "booking_item": "Klippning" }, "pageUrl": "https://…/kontakt", "meta": { "userAgent": "…" } }
```

The site has already validated fields, run the honeypot, the same-origin check,
the signed time-trap token and a rate limit before forwarding. The Hub stores the
submission in **S-Hub Inbox** and sends the admin/customer notifications, exactly
as it does for WordPress form posts. `booking_*` fields carry the structured
booking data. Respond `{ "ok": true }` or `{ "ok": false, "error": "…" }`.

## Revalidation webhook (Hub → site)

When content changes, the Hub calls the site to purge its cache. Sign it with the
site secret (same scheme, `X-Staark-*` headers).

```
POST https://<site>/api/staark/revalidate
{ "tags": ["staark:page:/priser", "staark:pages"], "paths": [] }
```

Cache tags the site uses:

| Tag | Purge when |
| --- | --- |
| `staark:site` | site settings, branding, navigation change |
| `staark:pages` | a page is added/removed/reordered |
| `staark:page:/<path>` | that page's content changes |
| `staark` | everything (full rebuild) |

`GET /api/staark/revalidate` (signed) returns a status ping — the reverse of the
WordPress `/ping` endpoint — so the Hub can confirm the connector is live.

## Pairing

Reuse the existing pairing flow. `POST /api/hub/wordpress/connect` can stay as-is;
a Next.js site is paired the same way (a pairing code exchanged for a
`site_id` + `site_secret`, then stored as `STAARK_SITE_ID` / `STAARK_SITE_SECRET`
in the site's environment). If you prefer a distinct namespace, add
`/api/hub/next/connect` with an identical body.
