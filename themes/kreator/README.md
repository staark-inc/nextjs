# S-Hub Kreatör

Child theme of S-Hub Light for streamers and content creators — a full site
built around the "link in bio" use case. It inherits every Light section through
`parentId: "light"` (contact for business enquiries, testimonials, cta …),
overrides `hero`, and adds the blocks below.

## Blocks

| `type` | What it does |
| --- | --- |
| `hero` | Creator name, avatar with a status tag ("Live pe Kick"), follower stats, the main platform buttons (the first is highlighted) and a featured creator code with a copy button. |
| `partnerCodes` | Sponsor and affiliate cards: offer, copyable code, logo or monogram, category filters and a `rel="sponsored"` link, with an advertising disclosure line. |
| `streamSchedule` | The week, Monday first, with today's row marked in the creator's time zone (`timeZone`, IANA). |
| `videoGrid` | Latest videos as link cards (thumbnail, duration, views). Nothing is embedded, so no third-party player or cookies load until the visitor clicks. The first video is large. |
| `gearSetup` | PC, peripherals and audio as spec lists, game settings (DPI, sens, resolution …) and an optional copyable config (e.g. crosshair code). |
| `socialLinks` | Every channel as a tile with handle and follower count (numbers are shortened to 184k / 2,5M). The platform is detected from the URL or set explicitly. |

Platform icons are generic glyphs next to the platform name, not brand logos.

## Preset

`presets/kreator.json` — dark: near-black paper, off-white ink, electric-lime
accent used as a fill (dark text on it), Unbounded display over Onest, JetBrains
Mono for codes and labels. Adds a `live` colour token. Fonts are self-hosted
through Fontsource and include Romanian diacritics.

## Install

See [INSTALL.md](INSTALL.md). A demo site ("Rendo", Romanian) ships in `demo/`.
