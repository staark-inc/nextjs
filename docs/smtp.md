# SMTP transport

Staark Next keeps outbound email disabled until a deployment explicitly
configures a server-side transport.

## Environment

```env
STAARK_MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer@example.com
SMTP_PASSWORD=...
SMTP_FROM=Staark Site <mailer@example.com>
SMTP_REPLY_TO=support@example.com
SMTP_TLS_REJECT_UNAUTHORIZED=true
SMTP_CONNECTION_TIMEOUT_MS=10000
```

`SMTP_USER` and `SMTP_PASSWORD` are optional as a pair. This allows a trusted
SMTP relay to authenticate the deployment by IP/network policy instead of
storing SMTP credentials in the application.

Port `465` normally uses `SMTP_SECURE=true`. Submission on `587` normally uses
`SMTP_SECURE=false` and upgrades the connection with STARTTLS.

Do not disable TLS certificate validation in production.

## Manager diagnostic endpoint

`POST /api/admin/mail/test` is manager-only.

Verify the connection without sending:

```json
{ "verifyOnly": true }
```

Send a diagnostic message:

```json
{ "to": "you@example.com" }
```

The endpoint never returns SMTP credentials.

## Deliverability

SMTP transport only handles delivery to the mail server. SPF, DKIM, DMARC,
domain alignment, sender reputation and provider-side relay configuration are
separate deployment concerns and belong to the deliverability layer.
