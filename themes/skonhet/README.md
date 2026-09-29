# S-Hub Skönhet

Child theme of S-Hub Light for hair & nail studios (frisör, naglar, fransar &
bryn). It inherits every Light section through `parentId: "light"`
(testimonials, cta, process …), overrides `hero`, and adds the blocks below.

## Blocks

| `type` | What it does |
| --- | --- |
| `hero` | Light hero props plus `headingAccent` (italic tail of the heading), `detailImage` (round inset), `badge` (e.g. "−15 % första besöket") and `showVisit` (address + opening hours from site settings). |
| `serviceMenu` | Treatments in tabs (Hår / Naglar / Fransar & bryn) with duration, price and a "Boka" link that preselects the treatment in the booking form (`?tjanst=`). All panels render server-side, so the full price list is crawlable. |
| `stylists` | Team cards with role, specialties and "Boka med …" links (`?med=`). No photo → serif initials. |
| `lookbook` | Recent work with category filters (derived from each image's `category`). |
| `bookingRequest` | Three-step booking request (behandling → tid → kontakt) posting to `/api/staark/forms`. It sends `booking_type`, `booking_date`, `booking_time` and `booking_item` (stylist), so S-Hub Inbox files it as a booking the salon confirms. Optional `externalBooking` link for Bokadirekt or similar. |

## Preset

`presets/skonhet.json` — porcelain paper, deep plum ink and accent, blush
surfaces, Instrument Serif display (with italics) over Manrope, pill buttons and
arched images. Fonts are self-hosted through Fontsource.

## Install

See [INSTALL.md](INSTALL.md). A demo site ("Studio Lumi") ships in `demo/`.
