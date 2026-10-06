# Blog addon: first working extension

`@staark/addon-blog` implements a read-only project blog. The custom runtime
bundles its trusted implementation, then each manifest decides whether it is
enabled. No registration in the legacy metadata addon registry is needed.

## Demo

The included custom demo activates `blog` alongside the existing extensions.
Visit `/blog` and `/blog/valkommen-till-bloggen`. Public JSON is available at
`/api/addons/blog` and `/api/addons/blog/valkommen-till-bloggen`.
The demo has two published articles and one draft. The draft is not returned by
either pages or API. Health lists `blog` as an active addon, but does not read
or validate the content file until a blog page or API is requested.

```json
{
  "key": "blog",
  "enabled": true,
  "config": {
    "basePath": "/blog",
    "title": "Blog",
    "description": "Nyheter och inspiration från oss."
  }
}
```

Put this entry in `runtime.addons`. `enabled` defaults to true. Set it to false
or remove the entry to disable the service, navigation link, pages and API.
Disabled blog URLs return 404 even when accessed directly. Existing explicit
Next.js routes take precedence over the blog catch-all, so choose an unused
basePath. Reserved admin/API paths are rejected. Nested paths such as
`/news/blog` work; API paths remain `/api/addons/blog`.

## Content owned by the selected project

The content file is always `content/blog.json` next to the selected manifest.
For shared-root selection that means:

```text
/srv/staark/projects/salon/staark.custom.json
/srv/staark/projects/salon/content/blog.json
/srv/staark/projects/workshop/staark.custom.json
/srv/staark/projects/workshop/content/blog.json
```

```json
{
  "projectKey": "salon",
  "posts": [{
    "slug": "hello",
    "title": "Hello",
    "excerpt": "A short introduction.",
    "paragraphs": ["First paragraph.", "Second paragraph."],
    "status": "published",
    "publishedAt": "2026-10-06T10:00:00Z"
  }]
}
```

`projectKey` must match the selected manifest's `project.key`. Slugs are unique
lowercase letters, numbers and hyphens. Published articles require an ISO UTC
timestamp. Drafts and articles with a future timestamp are withheld from public
reads. Omitted `status` defaults to draft. Plain paragraphs render as escaped
React text; HTML and Markdown are not interpreted.

Missing content produces an empty list. Malformed JSON, invalid article data,
duplicate slugs, mismatched project identity and content symlinks escaping the
project fail the read. The API returns a generic 503 for these configuration
failures. It never falls back to another project's demo data.

## Boundaries

The package owns configuration, content validation and read services. Next.js
routes live in the host: the catch-all delegates matching URLs to the blog only
when enabled. This is the first concrete addon integration, not a general
dynamic router for every future extension. The demo view uses the existing
project header/footer/layout/style overrides and theme preset variables.
Project-specific blog view components can be introduced later.

There is no editor/dashboard, mutation API, database migration, categories,
pagination or rich-text engine in this prototype. Edit the project's JSON file
to test publication; changes are read on the next request without rebuilding.
Changing addon implementation or view code requires a build. Mount or copy the
selected project directory into a production container, including its content:
the standalone bundle does not embed arbitrary external project files.

## Run and verify

```bash
pnpm install --frozen-lockfile
pnpm --filter @staark/addon-blog typecheck
pnpm --filter @staark/addon-blog test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime build
pnpm --filter @staark/custom-runtime dev
```

The homepage's Blog link appears only for an enabled blog. Navigate to the
configured basePath, open an article, check that the draft is absent, then
disable the addon and verify both the page and API return 404. With two selected
projects, each instance must return only its own articles.
