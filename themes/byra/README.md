# S-Hub Byrå — theme reference

Child theme of **S-Hub Light** for agencies and studios. Bold editorial look
(near-black ink, warm off-white paper, electric-coral accent, heavy display
type, sharp edges). Reuses every parent section and adds four of its own.

Activate with `STAARK_THEME=byra`.

## Block types ("shortcuts")

Each content block's `type` selects a section. `props` is validated by that
section's Zod schema — a missing required field fails the build with a clear
message. These are the theme's own blocks (in addition to the parent's `hero`,
`services`, `process`, `testimonials`, `cta`, `contact`):

### `stats`
Row of big impact numbers.
```json
{ "id": "s", "type": "stats", "props": { "items": [ { "value": "120+", "label": "Projekt levererade" } ] } }
```

### `caseStudies`
Portfolio grid of bold color panels. `span: 1` = full-width feature card.
```json
{ "id": "work", "type": "caseStudies", "props": {
  "heading": "Utvalt arbete",
  "items": [
    { "title": "Rebrand", "client": "Volt Energi", "result": "+38% konvertering", "tags": ["Brand", "Webb"], "span": 1 }
  ]
} }
```
`image` (optional) becomes a darkened background; without it, the card uses a
tone color, so it renders fully offline.

### `team`
Team grid. Members without a `photo` get a colored **monogram** avatar (initials).
```json
{ "id": "team", "type": "team", "props": { "heading": "Teamet", "members": [ { "name": "Elin Norrby", "role": "Creative Director" } ] } }
```

### `logos`
Client logo wall. Renders wordmarks as text when no `src` is given.
```json
{ "id": "clients", "type": "logos", "props": { "heading": "Betrodda av", "logos": ["Volt", "Nord Bank", { "name": "Kappa", "src": "/uploads/kappa.svg" }] } }
```

## Preset

`presets/byra.json` — same JSON format as every S-Hub preset. Swap the display
`font` there for a custom editorial typeface without touching the sections.
