# Custom Base: independent parent theme

`@staark/theme-custom-base` is a parent theme for Custom projects. It depends on
the shared contracts/rendering in `@staark/core` and `@staark/theme-kit`, with
no dependency or parent relationship to `theme-light`. Its editorial chrome,
geometric artwork and `cb-*` CSS namespace are separate from the SaaS design.

## Select a preset

```json
"theme": { "family": "custom-base", "variant": "studio" }
```

Presets are `studio` (warm paper/violet), `midnight` (dark/lavender), and
`gallery` (light/green). They expose identical color, typography, radius and
layout token keys. The frame generates CSS variables with theme-kit and scopes
the Custom palette to `.cb-root`. Site `theme.overrides` can change those tokens.
`theme.family` and `theme.preset` in site content cannot override the deployment
manifest's selection.

The included demo turns off `components`, `layouts` and `styles` overrides so
the new base is visible. Existing project overrides are retained on disk. Turn
the capabilities back on when a particular project needs its own components,
chrome or CSS. These flags govern overrides, not whether the base theme has
layout/styles.

## Blocks and shortcuts

| Block type | Shortcut | Purpose |
| --- | --- | --- |
| `hero` | `intro` | Editorial headline, actions and optional artwork |
| `text` | `story` | Introduction and paragraphs |
| `services` | `features` | Numbered feature rows |
| `projectsShowcase` | `work` | Concept/project gallery |
| `stats` | `numbers` | Number strip |
| `shortcuts` | `links` | Navigation links |
| `cta` | `contact` | Closing invitation |
| `imageText` | `split` | Image and body text |
| `faq` | `questions` | Expandable answers |
| `gallery` | `photos` | Image grid with modal viewer |

Each block has a renderer, Zod props validation and a Blocks v2 definition with
field descriptors, defaults, category and required fields. The hero also has a
`type-only` block preset. Definitions, aliases and the legacy picker adapter
are plain data, usable by a future editor. `/api/runtime/blocks` exposes the
base catalog when the selected family is Custom Base or a registered child.
This endpoint is read-only and contains structural metadata, not project content.
It does not create an admin editor or authorize content writes.

```ts
import { createCustomBaseBlock } from "@staark/theme-custom-base/blocks";

const hero = createCustomBaseBlock("intro", "page-hero", {
  heading: "Your own direction.",
});
const typeOnly = createCustomBaseBlock("hero", "second-hero", {}, "type-only");
```

Every call clones defaults, validates props and returns `{ id, type, props }`.
Aliases are construction helpers, not URL routes and not alternate stored block
types: persist `type: "hero"`, not `type: "intro"` in JSON. Blocks can be reordered
or removed in page content. Default anchor names in the renderers are fixed for
this initial theme (`story`, `services`, `work`, `contact`). To repeat these
sections with unique anchors, extend the renderer/props contract first.

## Project-owned content

The runtime now reads the homepage and site chrome from the selected project's
`content/home.json` and `content/site.json`. Both require `projectKey` matching
the manifest. Site content otherwise uses the existing `SiteSettings` shape;
home content uses `Page` with `path: "/"`, `title`, `seo`, and `blocks`.

```json
{
  "projectKey": "custom-demo",
  "path": "/",
  "title": "My project",
  "blocks": [{
    "id": "intro",
    "type": "hero",
    "props": { "heading": "Your own direction.", "intro": "A short introduction." }
  }]
}
```

Missing site/home files produce minimal project-specific defaults; they do not
copy demo content from another directory. Wrong project identity, malformed
content, duplicate block ids and unsupported block types fail. Symlinks cannot
escape the selected project's directory. Content changes take effect on the
next request. TypeScript/CSS changes require a build. Copy/mount the project
directory and its content into standalone production deployments.

The base chrome is used when there is no allowed project chrome override. The
same frame wraps the homepage, project pages and blog, so preset changes apply consistently.
An enabled blog contributes a header link using its configured basePath.
Project-authored static navigation links remain operator-owned content.

## Extend into a child theme

Create another workspace theme package and register it in the runtime's theme
catalog, dependencies, transpile packages and CSS imports. Keep its registry
pointed at the parent:

```ts
import customBase from "@staark/theme-custom-base";
import type { ThemeDefinition } from "@staark/theme-kit";

export const portfolioTheme: ThemeDefinition = {
  ...customBase,
  id: "custom-portfolio",
  name: "Custom Portfolio",
  parentId: "custom-base",
  sections: { /* Only new or overridden renderers. */ },
};
export const portfolioRegistry = {
  "custom-base": customBase,
  "custom-portfolio": portfolioTheme,
};
```

Presets are retained by the spread; theme-kit resolves inherited sections
through `parentId`. A child can replace presets and introduce its own block
definitions. The base catalog endpoint currently returns base definitions;
extend its catalog mapping when you introduce child-specific blocks. Business
logic, authentication and API integrations belong to modules/addons and the
host, rather than this visual package.

## Verify

```bash
pnpm install --frozen-lockfile
pnpm --filter @staark/theme-custom-base typecheck
pnpm --filter @staark/theme-custom-base test
pnpm --filter @staark/custom-runtime typecheck
pnpm --filter @staark/custom-runtime test
pnpm --filter @staark/custom-runtime build
pnpm --filter @staark/custom-runtime dev
```

See [Custom pages and gallery](CUSTOM-PAGES-AND-GALLERY.md) for page files, media
props, publication status and route precedence.

Open `/`, `/om-oss`, `/tjanster`, `/galleri`, `/kontakt`, `/blog`, `/api/runtime/blocks`, and `/api/runtime/health`. Try all
three manifest presets, and verify project content and disabled addon behavior.
The demo gallery is explicitly conceptual artwork, not a claim of completed
client work. A dashboard/editor and write permissions are separate future work.
