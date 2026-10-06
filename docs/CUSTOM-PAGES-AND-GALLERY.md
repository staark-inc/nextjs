# Custom pages and media blocks

Each selected project owns its pages under `content/pages`. For example,
`content/pages/om-oss.json` serves `/om-oss`, and
`content/pages/guides/start.json` serves `/guides/start`.
The homepage continues to use `content/home.json`.

```json
{
  "projectKey": "custom-demo",
  "status": "published",
  "path": "/om-oss",
  "title": "Om oss",
  "seo": { "description": "Our story", "noindex": false },
  "blocks": [
    { "id": "intro", "type": "hero", "props": { "heading": "Our studio", "artwork": false } },
    { "id": "photos", "type": "gallery", "props": {
      "heading": "Selected work", "columns": 3,
      "items": [{ "src": "/images/studio.jpg", "alt": "Our studio workspace", "caption": "Inside the studio", "width": 1200, "height": 900 }]
    } }
  ]
}
```

`projectKey` must match the manifest, and `path` must match the file location.
URL segments use lowercase ASCII letters, numbers and hyphens. Missing pages
and `status: "draft"` return 404. Omitted status means published. Invalid
status, malformed content, identity mismatches and symlink escapes fail.
There is no fallback to another project's page. Page files are read on each
request; adding a content page does not require a new build.

The configured blog namespace takes precedence over static pages, including
when the addon is disabled. `/api`, `/admin`, `/dashboard` and `/_next` are
reserved. If the blog addon is removed entirely, its old namespace is no
longer reserved. Site navigation is explicit: add page URLs in
`content/site.json` under `navigation.primary` or `navigation.footer`.

Pages use the selected project's shared frame, theme preset and registered
sections. SEO supports page title/description, canonical URL from `site.url`,
Open Graph image and `noindex`. Set the real deployment URL in site content.
The shipped demo pages deliberately use `noindex: true`.

## Added blocks

| Type | Shortcut | Props |
| --- | --- | --- |
| `imageText` | `split` | Heading, intro, paragraphs, optional image, image side `left`/`right` |
| `faq` | `questions` | Heading, intro, question/answer items, optional `openFirst` |
| `gallery` | `photos` | Heading, intro, image items, 2/3/4 columns |

All three support an optional unique `anchor` (lowercase letter followed by
letters, digits or hyphens). Images require nonempty `alt`; dimensions default
to 1200 × 900. Sources must be rooted local paths or HTTPS URLs. Images use
native `<img>` with lazy thumbnails; external hosts do not require a Next
Image allowlist. External images are fetched by the visitor's browser. Keep
media URLs public; server credentials belong in integrations, not page JSON.

Gallery thumbnails open a native modal dialog with previous/next controls,
left/right arrow navigation and Escape to close. Focus returns to the original
thumbnail. FAQ uses native keyboard-accessible details/summary. Body copy,
captions and answers render as plain text. No HTML from JSON is executed.
Gallery defaults contain no assets; the host supplies its images. The demo's
three SVG illustrations under `public/custom-demo` are conceptual artwork.

The included `/om-oss`, `/tjanster`, `/galleri` and `/kontakt` pages exercise
the new blocks. Demo navigation and hero buttons use separate page URLs; the
hero accepts an optional `more` link instead of a hardcoded `#story` link.
Contact includes an email action and a `contactForm` block. Configure the forms
addon and SMTP settings as described in [Custom email forms](CUSTOM-EMAIL-FORMS.md).
Replace the demo email in site and page content before publishing. The block
catalog at `/api/runtime/blocks` contains eleven Custom Base definitions. This
adds public pages and presentation blocks; content editing and image upload
remain separate work.

## Verify

```bash
pnpm --filter @staark/theme-custom-base test
pnpm --filter @staark/theme-custom-base typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime build
pnpm --filter @staark/custom-runtime dev
```

Visit `/`, `/om-oss`, `/tjanster`, `/galleri`, `/kontakt`, `/blog` and `/api/runtime/blocks`.

Blog pages use a neutral surface scoped to `.cb-root--blog`, with preset-owned
`blog-paper`, `blog-surface` and `blog-line` tokens. Studio/Gallery use grey-white
surfaces; Midnight retains its dark palette. Homepage colors remain preset-owned.
