# Email templates and submission notifications

Staark Next uses one shared email visual template for all website notifications.
The content changes by submission kind (`contact`, `lead`, `booking`) while the
branding/layout stays consistent.

## Notification ownership

`STAARK_NOTIFICATION_MODE` decides who owns notification delivery:

- `hub` (default): keep the existing architecture where Staark Hub owns email notifications.
- `local`: the Next deployment sends the admin notification with its configured SMTP transport.
- `disabled`: no email notification is sent by this deployment.

The default intentionally remains `hub` so existing paired deployments do not
start sending duplicate emails after an update.

Local mode requires:

```env
STAARK_NOTIFICATION_MODE=local
STAARK_NOTIFICATION_TO=owner@example.com
STAARK_ADMIN_BASE_URL=https://example.com
```

`STAARK_ADMIN_BASE_URL` is optional. When present, emails include an `Open inbox`
button pointing to `/admin/forms`.

## Failure behavior

The form submission is stored/forwarded first. Notification delivery runs after
that. If email delivery fails, the failure is logged, but the visitor still sees
a successful form submission. This avoids losing a valid lead because SMTP is
temporarily unavailable.

## Reply-To

When the submission contains an `email` field, the admin notification uses it as
`Reply-To`, so replying from the mail client goes directly to the visitor.
