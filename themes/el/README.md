# S-Hub El

Child theme of S-Hub Light for electricians. It inherits every Light section
through `parentId: "light"` (services, testimonials, cta …), overrides `hero`
and `process`, and adds the blocks below.

## Blocks

| `type` | What it does |
| --- | --- |
| `emergencyBanner` | Yellow jour strip under the header, plus a sticky Ring / Begär offert bar on phones. Same props as S-Hub Hantverk. |
| `hero` | Dark hero. Light hero props plus `highlight` (words in the heading drawn with the yellow marker), `showPhone` and `authorization` (e.g. "Auktoriserat elinstallationsföretag"). |
| `credentials` | Authorization, insurance and egenkontroll, with an optional link to Elsäkerhetsverket so customers can verify the company. |
| `deductionCalculator` | Price after deduction. Each option is ROT (30 % of labour) or grön teknik (laddpunkt/batteri 50 %, solceller 15 % of labour + material). Rates and the 50 000 kr cap are props. |
| `process` | Numbered step cards. |
| `faq` | Native `<details>` accordion with FAQPage structured data. |
| `quoteRequest` | Three-step quote form posting to S-Hub Inbox. Same props as S-Hub Hantverk. |

## Preset

`presets/el.json` — cool off-white, near-black ink, signal-yellow accent used as
a fill (buttons get dark text, links stay ink with a yellow underline), Space
Grotesk headings over IBM Plex Sans. Fonts are self-hosted through Fontsource.

## Install

See [INSTALL.md](INSTALL.md). A demo site ("Norrsken El") ships in `demo/`.
