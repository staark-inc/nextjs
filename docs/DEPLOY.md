# Deploying a Staark Next client site

A client deployment is a single container. Storage is `fs` on a mounted volume
(VPS/Docker) or `s3` for serverless/portable — nothing else changes.

## 1. Build & run with Docker Compose

From the repo root:

```bash
cp apps/starter/.env.example .env        # then edit the values below
docker compose up -d --build
```

Required environment (compose refuses to start without the admin ones):

```env
STAARK_THEME=webb                 # which theme this client ships
STAARK_CONTENT_DIR=content/webb
STAARK_CONTENT_SOURCE=fixtures    # or "hub" once paired

STAARK_STORAGE=fs                 # fs (uses the /data volume) or s3
ADMIN_USERNAME=site-admin
ADMIN_PASSWORD=<a strong password>
ADMIN_SESSION_SECRET=<32+ random characters>
STAARK_FORM_SECRET=<random>
```

The app listens on `:3000`. Content the admin edits, backups, revisions, media
and form submissions all persist to the `staark-data` volume (`/data`).

### S3 / serverless instead of a disk

```env
STAARK_STORAGE=s3
STAARK_S3_BUCKET=my-client-site
STAARK_S3_ENDPOINT=https://<acct>.r2.cloudflarestorage.com   # omit for AWS S3
STAARK_S3_ACCESS_KEY_ID=...
STAARK_S3_SECRET_ACCESS_KEY=...
```

## 2. Put it on a domain with HTTPS

Point an A record for `example.com` at the server, then run a reverse proxy in
front. Uncomment the `caddy` service in `docker-compose.yml` and add a
`Caddyfile` next to it:

```
example.com {
    reverse_proxy web:3000
}
```

Caddy fetches and renews a Let's Encrypt certificate automatically. Traefik or
nginx + certbot work the same way — proxy `:443` → `web:3000`.

Set `url` in the site's `content/<theme>/site.json` to `https://example.com` so
canonical URLs, the sitemap and Open Graph tags are correct.

## 3. Test performance (PageSpeed / Lighthouse)

Against the **live** domain, use Google PageSpeed Insights:

```
https://pagespeed.web.dev/analysis?url=https://example.com
```

Or run Lighthouse locally against the container or the live URL:

```bash
npm i -g lighthouse
lighthouse https://example.com --preset=desktop --view
```

### Reference scores

Lighthouse on the production build of the `webb` demo (empty demo images):

| Category | Desktop | Mobile |
| --- | --- | --- |
| Performance | 100 | 94 |
| Accessibility | 100 | 100 |
| Best Practices | 96¹ | 96¹ |
| SEO | 100 | 100 |

Core Web Vitals (mobile): FCP 0.8s · LCP 1.8s · CLS 0 · Speed Index 0.8s · TBT 270ms.

¹ The 4-point gap is `errors-in-console` from demo image URLs that don't resolve
in a sandbox; it clears once real, reachable images are set. Real content usually
scores 100/100/100/100 on desktop.

## Notes

- The image is Next.js **standalone** output — small, no dev dependencies at runtime.
- `output: "standalone"` + `outputFileTracingRoot` (repo root) are set in
  `apps/starter/next.config.ts` so the monorepo packages are traced into the build.
- Updating a client site: rebuild and redeploy the image, or (with the Hub)
  publish content and let the revalidation webhook refresh it without a redeploy.
