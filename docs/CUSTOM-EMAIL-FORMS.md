# Custom email forms and Docker test environment

`@staark/addon-forms` sends contact submissions through SMTP. The Custom Base
`contactForm` block owns presentation; the addon owns named form configuration,
validation, signed form tokens and mail delivery. No Hub integration is included.

```json
{
  "key": "forms",
  "config": { "forms": [{
    "key": "contact",
    "recipientEnv": "CUSTOM_CONTACT_TO",
    "subject": "New contact request",
    "phone": true
  }] }
}
```

Add `{ "id": "contact-form", "type": "contactForm", "props": {
"heading": "Tell us about your idea", "form": "contact" } }` to a page.
Each form collects name, email, optional phone and message. Labels are Swedish
in this initial component. `phone: false` removes that field. Multiple form keys
can have different recipients and subjects; this version does not have a dynamic
field builder, attachments, uploads, database storage or autoresponders.

## Server settings

Copy `apps/custom-runtime/.env.example` to `.env.local` for local Next development,
or use the Docker settings below. Required variables:

- `CUSTOM_FORMS_SECRET`: at least 32 characters, generated with `openssl rand -hex 32`.
- `CUSTOM_SMTP_HOST`, `CUSTOM_SMTP_FROM`, and the configured recipient variable.
- `CUSTOM_SMTP_PORT`: defaults to 587; port 465 defaults to implicit TLS.
- `CUSTOM_SMTP_SECURE`: `true` for implicit TLS, usually port 465.
- `CUSTOM_SMTP_REQUIRE_TLS`: defaults to `true` for STARTTLS.
- `CUSTOM_SMTP_USER` and `CUSTOM_SMTP_PASSWORD`: both set, or both absent for an authorized relay.

Use a sender address authorized by your SMTP provider. Visitor email becomes
Reply-To, never From. Mail is plain text and recipient/subject are taken from
server configuration. A success response means SMTP accepted the message;
it does not guarantee inbox delivery. SPF/DKIM/DMARC belong to the sending domain
and provider setup. No SMTP credentials or recipient addresses are exposed by
the form API. Runtime health checks do not connect to SMTP.

Set `content/site.json` `url` to the exact public site origin, e.g.
`http://localhost:3300` for this test. POST Origin must match that origin.
Changing ports/domains requires updating site content. Secrets are runtime
settings, never Docker build arguments. Restart the container after changing env.

## Request behavior

`GET /api/addons/forms/contact` returns a public form key, phone flag and a
project/form-bound signed token. `POST` accepts JSON `{ name, email, phone,
message, website, token }`; `website` is the hidden honeypot and must be empty.
Tokens become valid after two seconds and expire after one hour. Browser input
survives failed submissions; success is shown only after SMTP accepts the mail.

Missing SMTP/recipient/secret settings produce 503 and an unavailable message.
Disabled forms addon or unknown form key produces 404. Invalid payload/token or
honeypot produces 400; disallowed origin 403; throttling 429; SMTP failure 502.
Bodies are limited to 16 KiB by actual bytes read. Form APIs disable caching.

Limits are bounded and **process-local**: 5 attempts per client/project and
30 per project every ten minutes; 120 metadata reads per client/project per ten
minutes. Without a trusted proxy, all visitors share the client bucket. Enable
`CUSTOM_FORMS_TRUST_PROXY=true` only when your reverse proxy replaces X-Real-IP
and direct access to the app is blocked. Proxy headers are ignored otherwise.
Use a shared limiter before running multiple replicas. Honeypot, token delay,
origin checks and throttling are basic protections, not a CAPTCHA service.

## Docker test

From the repository root:

```bash
cp apps/custom-runtime/.env.docker.example apps/custom-runtime/.env.docker
secret=$(openssl rand -hex 32)
sed -i "s/^CUSTOM_FORMS_SECRET=.*/CUSTOM_FORMS_SECRET=$secret/" apps/custom-runtime/.env.docker
docker compose -f compose.custom-runtime.yml up -d --build
docker compose -f compose.custom-runtime.yml logs -f custom-runtime
```

The app is at `http://localhost:3300/kontakt`; captured messages are at
`http://localhost:8025`. The app and Mailpit web UI are published only to loopback.
Mailpit SMTP is internal to the Compose network. Docker Compose 2.24+ is needed
for the required env file syntax. If Next dev already uses 3300, stop it first.
For LAN testing, deliberately change the port binding and `site.url` together;
keep Mailpit private.

Compose mounts `apps/custom-runtime/project` read-only at `/data/project`.
Content/manifest edits are read on the next request. Bundled TypeScript theme,
addon, layout and public asset edits require rebuilding the image. A different
project directory can replace the mount; it must use extensions/themes bundled
in the image. The runtime image includes a demo project when no mount is used.
It runs as a non-root user, serves traced standalone dependencies and includes
public/static assets. It has a runtime health check and needs no database.

Mailpit's example settings deliberately disable SMTP TLS on the isolated test
network. To send actual mail later, change the runtime SMTP variables and
recipient to your provider, enable TLS, and restart the app. Mailpit is a test
sink and does not forward these messages to real recipients.

```bash
docker compose -f compose.custom-runtime.yml down
```

## Validation

```bash
pnpm install --frozen-lockfile
pnpm --filter @staark/addon-forms test
pnpm --filter @staark/addon-forms typecheck
pnpm --filter @staark/theme-custom-base test
pnpm --filter @staark/theme-custom-base typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime build
```
