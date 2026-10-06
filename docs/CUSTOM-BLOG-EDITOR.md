# Custom blog editor and project images

The Custom workspace has **Blog articles** (when the project's blog addon is
enabled) and **Image library**. Both use the existing admin login, session and
CSRF/origin checks. No extra environment variables or database are required.

## Articles

Open an article or choose **New article**. Set title, slug, excerpt, cover,
visibility and optional publication time. Existing slugs are fixed.
Publication time uses the browser’s local timezone and is stored as UTC.
**Publish now** uses server time and overrides draft/future-date settings.
Saving without that action keeps the selected visibility/publication time.
A future published timestamp keeps the article off public routes/API until that
time. Drafts stay private regardless of their date.

Content supports paragraphs, headings, ordered/unordered lists, links and images,
with reordering/removal. React escapes text; HTML is not interpreted.
SEO overrides title, description, indexing and sharing image. Public articles
generate canonical and Open Graph metadata; sharing images fall back to covers.
The blog index can show covers. Articles appear in the configured blog listing
(Studio: /blog, Forma: /journal), not automatically on the home page.

**Save & preview** saves first and opens an authenticated preview using the actual
project theme. Public draft/scheduled article URLs return 404.
Unsaved-change prompts protect workspace navigation and closing the browser.
Saving a published article immediately changes the live site.

Existing paragraph-only articles remain readable without migrating files.
On save, the structured body becomes authoritative; a plain paragraph array is
retained for older API consumers. Articles stay in `content/blog.json`.

## Images

Upload JPEG, PNG or static WebP with alternative text. Limits are 5 MiB and
20 megapixels. Images are decoded, rotated, resized to fit 2400 × 2400 without
enlargement, and encoded as WebP with metadata removed. SVG, GIF and animated
images are rejected. Names and alternative text are searchable.

Choose images for article covers/content/sharing and page sharing images,
Image and text sections, and Gallery items. For a gallery, add an item first
and choose its image. Captions and alternative text are editable per usage.

Files live in `content/media/<uuid>.webp`; metadata lives in `content/media.json`.
URLs are `/media/<projectKey>/<uuid>.webp`. A runtime only serves registered
images from its selected project. Images are **public assets**: draft text is
private, but uploaded image URLs are public even when used only in drafts.
Do not upload confidential documents.

Limits: 500 images / 1 GiB per project, one upload per project at a time, at most
two concurrent uploads per process, and 30 upload attempts per project per ten
minutes. Rate limits reset on restart. Upload bytes persist only when metadata
is committed. A crash between these operations may leave an unregistered file;
public routes will not serve it.

## Storage and conflicts

The Docker editor overlay already mounts each selected project in a separate
writable volume. Blog JSON, images, pages and history survive rebuilds and
container recreation. Existing volume data is preserved. Back up entire volumes.

Blog revisions cover the whole collection: editing another article concurrently
also produces a 409 rather than overwriting it. Copy unsaved text before reload
if needed. Writes use locks, previous-byte history and temporary-file rename.
Media metadata uses the same mechanism. History has no retention/restore UI;
follow [CUSTOM-EDITOR.md](CUSTOM-EDITOR.md) for backup and stale-lock recovery.

Limits: 1 MiB per blog collection/request, 500 articles, 200 blocks per article.
Symlinked content paths are rejected. `/media` is reserved for assets alongside
admin/API/dashboard routes and configured blog namespaces.

This version has no image deletion/crop UI, article deletion, URL renaming,
roles, categories, inline rich-text formatting or revision restore interface.

## Two-project Docker test

Keep existing credentials in `apps/custom-runtime/.env.docker`.

```bash
cd /home/debian/staark-next
git fetch origin feat/custom-blog-media-editor:refs/remotes/origin/feat/custom-blog-media-editor
git switch feat/custom-blog-media-editor
git pull --ff-only

CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose \
  -f compose.custom-projects.yml -f compose.custom-editor.yml build studio
CUSTOM_TEST_BIND_IP=192.168.0.10 docker compose \
  -f compose.custom-projects.yml -f compose.custom-editor.yml up -d --no-build studio forma
```

Studio: `http://192.168.0.10:3302/admin`.
Forma: `http://192.168.0.10:3303/admin`.

Browser acceptance: upload an image, save a draft with cover and structured body,
preview privately, confirm its public URL is 404, publish, check SEO and the blog
index cover, then choose the image in a page gallery. Sign into Forma separately
and check its library/articles differ. Recreate containers and verify persistence.

Automated checks cover schemas, draft/future visibility, conflicts, backups,
isolation, conversion/metadata stripping, limits, symlinks and unregistered files.
Standalone production HTTP checks cover two projects, auth/CSRF/origin, upload
rejection, private preview, publication, SEO, page gallery and restart persistence.
Docker and interactive browser acceptance must run on the test host.
