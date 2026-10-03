# S-Hub Verkstad

Child theme of S-Hub Light for car workshops. It inherits every Light section
through `parentId: "light"` (testimonials, cta, services …), overrides `hero`,
and adds the blocks below.

## Blocks

| `type` | What it does |
| --- | --- |
| `hero` | Dark hero with a Swedish licence-plate box. A plain GET form sends `?regnr=` to the booking block, so it works without JavaScript. |
| `promises` | What customers can count on (alla märken, fast pris, lånebil, "vi ringer först"), with named line icons. |
| `priceTable` | Fixed prices per car size in real tables (one per group), with "Boka" links that preselect the service (`?tjanst=`). Rows stack into cards on phones. |
| `highlightBand` | Seasonal or campaign strip (däckbyte, AC), with facts and a button. |
| `faq` | Native `<details>` accordion with FAQPage structured data. Same props as S-Hub El. |
| `serviceBooking` | Three-step booking: registration number (validated, normalised to "ABC 123"), services, drop-off day and time, loan car, contact. Lands in S-Hub Inbox as a booking with the plate as `booking_item`. |

## Preset

`presets/verkstad.json` — warm concrete paper, asphalt ink, motor-red accent,
condensed uppercase Barlow headings. Fonts are self-hosted through Fontsource.

## Install

See [INSTALL.md](INSTALL.md). A demo site ("Motorhallen") ships in `demo/`.
