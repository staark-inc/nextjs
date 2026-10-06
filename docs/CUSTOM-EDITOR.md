# Custom workspace and page editor

`/admin` is an independent Custom Base workspace. Each process edits only its
selected project; API inputs cannot select another project or directory.

## Available now

- Project overview: pages, drafts, available blocks and active addons.
- Existing/new pages, nested URLs, title, SEO and draft/published status.
- Eleven Custom Base blocks, searchable by name or shortcut.
- Add, duplicate, remove/reorder sections; edit text, links, images, booleans,
  selects, nested objects and lists (including gallery/FAQ items).
- Authenticated saved-page preview with the actual project theme and chrome.
- Atomic JSON saves, revision conflicts and private previous-version backups.

`Save changes` applies the selected visibility immediately. Choosing Draft for
an existing published page unpublishes it. Home must remain published.
`Save & preview` saves first; it is not an unsaved live preview. Links inside
the preview open public URLs. New pages are not automatically added to site
navigation; navigation and branding remain in `content/site.json`.

This first version supports `custom-base` and its standard block schemas.
Other theme families and unregistered custom block types fail explicitly.
Blog editing, image upload, site settings, roles and a history restore UI are
not implemented yet. Existing public blog/form addons continue working.

## Credentials

Admin is disabled by default. Add server-only settings to
`apps/custom-runtime/.env.docker` (Docker) or that app's `.env.local` (dev):

```dotenv
CUSTOM_ADMIN_ENABLED=true
CUSTOM_ADMIN_USERNAME=admin
CUSTOM_ADMIN_PASSWORD_HASH=<generated salt:hash>
CUSTOM_ADMIN_SESSION_SECRET=<independent random secret>
CUSTOM_ADMIN_ALLOW_HTTP=false
```

Generate credentials from the repository root without placing the password in
shell history or process arguments:

```bash
read -rs -p 'Admin password (at least 12 characters): ' custom_admin_password
printf '%s' "$custom_admin_password" | node apps/custom-runtime/scripts/admin-password.mjs
unset custom_admin_password
openssl rand -hex 32
```

Copy the first output to PASSWORD_HASH and the second to SESSION_SECRET.
The single operator account is configured per process; give instances different
environment credentials when different people administer them.

Sessions are signed, project-bound, HttpOnly, SameSite=Strict and last eight
hours. Each project has a different cookie name, allowing side-by-side instances
on one host. Password-hash, username or session-secret rotation invalidates
existing sessions. Mutations require the exact configured site origin plus a
session CSRF token; login also requires that origin. The process-local login
limit is five attempts per project in ten minutes, independent of untrusted
proxy headers. Multi-replica deployments need a shared limiter.

Set `STAARK_CUSTOM_SITE_URL` to the browser's exact public origin. HTTPS is
required by default and uses Secure cookies. Set `CUSTOM_ADMIN_ALLOW_HTTP=true`
only for local HTTP tests. The HTTP build override separately controls CSP/HSTS.
No password hash or session secret is exposed in client props/API responses.

## Persistent Docker test

The editor overlay replaces the selected project's read-only bind mount with
its own named volume. An initializer seeds empty Studio/Forma volumes from the
new image and gives runtime UID 1001 ownership. It preserves existing data on
rebuild/recreation. Each runtime keeps the other project's bind mount read-only.

First add username, password hash and session secret to `.env.docker` as above.
The overlay enables admin and HTTP cookies; both demos use those credentials
by default, while sessions and editable files remain project-specific.

```bash
git fetch origin
git switch feat/custom-editor
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose \
  -f compose.custom-projects.yml -f compose.custom-editor.yml build studio
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose \
  -f compose.custom-projects.yml -f compose.custom-editor.yml up -d --no-build
```

- Studio: `http://192.168.0.10:3302/admin`
- Forma: `http://192.168.0.10:3303/admin`
- Mailpit: `http://192.168.0.10:8027/`

The first seed uses image demo files, not changes in an earlier running stack.
Subsequent builds keep the edited volume content. Edits live in these volumes,
not the Git checkout; export them to put edited content under source control.
`down` preserves volumes; `down -v` deletes edited projects and their history.
Back up volumes before removing them.

For a dev bind mount, grant the runtime user write access and remove `:ro` only
from that project's mount. A read-only mount produces a storage error instead
of a false successful save. The runtime stays non-root without a Docker socket.

## Storage and recovery

Pages remain in `content/home.json` and `content/pages/<path>.json`, with
`projectKey` and `status`. Public routes omit drafts. Reserved admin/API/dashboard
routes and configured blog namespaces cannot be page URLs. Existing URLs cannot
be renamed in this version.

Reads return a SHA-256 revision of the file bytes. Saving requires that revision
(or `null` for new files). Other saves or external edits produce a 409 conflict.
Reload explicitly discards unsaved changes. Filesystem locks serialize editor
saves across processes; temporary-file rename prevents partial page JSON.
External writers should use the editor API/lock protocol for concurrent writes.

Previous bytes are stored in `.custom-editor/history/<page-file-hash>/` before
replacement, with no public route. There is no retention cleanup/restore UI yet;
include history in backups and monitor disk usage. Restore by stopping edits and
copying the chosen history JSON back after checking its `projectKey`/`path`.
A crash can leave a directory in `.custom-editor/locks/`; remove that specific
lock only after verifying that no process is saving the page.

Validation checks project identity, publication status, unique block IDs and all
standard block props, including safe links/images. Symlink parents, targets and
history directories are rejected. Project files/manifests are operator-managed,
not writable by untrusted local users. Limits: 1 MiB per request/page, 100 blocks
per page, 500 listed pages and six URL segments.

## Verification

Tests cover credential/session rotation and project binding, reserved routes,
unsafe props, drafts/publication, exact history bytes, concurrent/stale saves,
external edits, symlink rejection and independent content. Production HTTP tests
exercise login/cookies, CSRF/origin checks, preview, saves and public rendering
on two processes. Docker needs testing on a machine with a Docker daemon.

Browser acceptance: sign in to both workspaces, edit a heading, move a block,
add gallery/FAQ items, save a draft, preview and publish. Also check unsaved-change
prompts, keyboard access and mobile layout.
