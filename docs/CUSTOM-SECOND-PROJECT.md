# Second project demo: Forma Atelier

`examples/custom-projects/forma-demo` is a second project with its own manifest,
site, homepage, pages, articles and form configuration. It shares the Custom Base
code with Custom Studio, rather than copying a runtime or a theme.

| Setting | Custom Studio | Forma Atelier |
| --- | --- | --- |
| Project key | `custom-demo` | `forma-demo` |
| Theme/preset | Custom Base / Studio | Custom Base / Midnight |
| Pages | `/om-oss`, `/tjanster`, `/galleri`, `/kontakt` | `/ateljen`, `/kollektion`, `/kontakt` |
| Blog | `/blog` | `/journal` |
| Form key | `contact` | `inquiry` |
| Phone field | Enabled | Disabled |
| Recipient variable | `CUSTOM_CONTACT_TO` | `CUSTOM_FORMA_TO` |
| Error registry | Custom Studio views | Forma Atelier views |
| Test port | 3302 | 3303 |

Forma uses different navigation, headlines, block ordering, gallery layout and
published blog articles. Its SVG concept illustrations are under
`apps/custom-runtime/public/forma-demo`. They are conceptual objects, not actual
products offered for sale. Both images' public assets are accessible from either
runtime because they are bundled public resources; project content/identity and
services are selected independently.

## Side-by-side Docker test

Use the existing `apps/custom-runtime/.env.docker` with your generated
`CUSTOM_FORMS_SECRET`. If starting fresh, copy `.env.docker.example` and fill
that secret as described in [Email forms](CUSTOM-EMAIL-FORMS.md).

From the repository root, on the Debian LAN host:

```bash
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose -f compose.custom-projects.yml build studio
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose -f compose.custom-projects.yml up -d --no-build
```

Build the shared image once via `studio`; `forma` uses the exact same image.
The Compose file enables the HTTP-test build flag, so CSS/JS stay on HTTP.
The stack name is `staark-custom-projects-test`, separate from the previous
`staark-custom-test`. Existing app/Mailpit containers on 3300, 8025 and 8026 are
not replaced. With no bind variable, ports bind to `127.0.0.1`.

- Studio: `http://192.168.0.10:3302/`
- Forma: `http://192.168.0.10:3303/`
- Test inbox: `http://192.168.0.10:8027/`

The test file overrides SMTP to its uniquely named internal
`custom-projects-mailpit` service. It captures both projects' messages with
separate To addresses and subjects: `studio-inbox@example.com` and
`forma-inbox@example.com`. It uses no real recipient/provider or SMTP credentials.
The secret is still required from the env file. This is a local test stack;
configure your real sender/recipients and TLS before production.

Both runtimes mount the same project root:

```text
/data/projects/custom-demo  <- apps/custom-runtime/project
/data/projects/forma-demo  <- examples/custom-projects/forma-demo
```

Environment selects `STAARK_CUSTOM_PROJECTS_ROOT=/data/projects` and a different
`STAARK_CUSTOM_PROJECT_KEY` for each process. Explicit manifest/directory sources
are cleared because they otherwise take precedence. Project directories are
read-only mounts. `STAARK_CUSTOM_SITE_URL` supplies each deployment's public
origin for canonical/OG metadata and form Origin validation, without editing the
mounted site's saved URL. URLs and published bind address use the same variable.
Changing the bind address requires recreating the containers.

```bash
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose -f compose.custom-projects.yml logs -f studio forma
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose -f compose.custom-projects.yml down
```

## Verify independence

Compare `/api/runtime/health` on both ports. Studio reports `custom-demo`; Forma
reports `forma-demo`. Open `/journal` on Forma and `/blog` on Studio: titles and
articles differ. Forma's `/blog` and Studio's `/journal` return 404. Articles
cannot be retrieved through the other project's blog API.

Submit both contact forms and inspect Mailpit: subject, recipient and the
project/form labels in the message body must match the originating project.
A token issued by one project is rejected by the other. A missing/draft page
never falls back to the other project, and a content `projectKey` mismatch fails.
Changing one project's page file affects only that project on the next request.
Bundled component/public asset changes require a rebuild.

For a single non-Docker instance:

```bash
STAARK_CUSTOM_PROJECT_DIR=../../examples/custom-projects/forma-demo \
STAARK_CUSTOM_SITE_URL=http://127.0.0.1:3303 \
pnpm --filter @staark/custom-runtime exec next dev -p 3303
```

The relative directory above is resolved from `apps/custom-runtime`, where
pnpm executes the app command. Set SMTP recipient `CUSTOM_FORMA_TO` separately
when using an actual provider.
