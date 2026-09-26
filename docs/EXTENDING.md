# Extinderea stack-ului Staark Next.js

Ghid practic pentru a continua singur: o temă copil nouă, secțiuni noi și date noi.
Modelul e mereu același ca la S-Hub Salong — copiezi tiparul, nu inventezi.

---

## 1. O temă copil nouă (ex. S-Hub Bygg)

Tema copil refolosește toate secțiunile din S-Hub Light prin `parentId: "light"`
și adaugă doar ce e specific industriei.

### a) Scaffold
```bash
mkdir -p themes/bygg/src/sections themes/bygg/presets
```

Copiază `themes/salong/package.json` → `themes/bygg/package.json` și schimbă:
- `"name": "@staark/theme-bygg"`
- descrierea

Copiază și `themes/salong/tsconfig.json` (rămâne identic).

### b) Presetul
Pui în `themes/bygg/presets/bygg.json` același format ca `salong.json`
(`tokens.colors/typography/radius/layout` + `components`). Poți copia direct
presetul din tema WordPress Bygg dacă există — formatul e identic.

### c) Secțiunile proprii
Fiecare secțiune e o funcție care primește `{ props, ctx }`, validează `props`
cu Zod și randează. Model minimal (`themes/bygg/src/sections/Projects.tsx`):

```tsx
import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow } from "@staark/theme-light";

const schema = z.object({
  heading: z.string(),
  items: z.array(z.object({ title: z.string(), image: z.string().optional() })).default([]),
});

export const Projects: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section" id="projekt">
      <Container>
        <h2>{p.heading}</h2>
        {/* ... */}
      </Container>
    </section>
  );
};
```

Primitive reutilizabile exportate din `@staark/theme-light`: `Container`,
`Button`, `Eyebrow`, `siteCta`.

### d) Definiția temei (`themes/bygg/src/index.ts`)
Copiază `themes/salong/src/index.ts` și schimbă `id`, `name`, presetul și
secțiunile noi:

```ts
import type { ThemeDefinition } from "@staark/theme-kit";
import lightTheme from "@staark/theme-light";
import bygg from "../presets/bygg.json" with { type: "json" };
import { Projects } from "./sections/Projects";

export const byggTheme: ThemeDefinition = {
  id: "bygg",
  name: "S-Hub Bygg",
  parentId: "light",
  presets: { bygg: bygg as ThemeDefinition["presets"][string] },
  defaultPreset: "bygg",
  sections: { projects: Projects },
};

export const byggRegistry = { light: lightTheme, bygg: byggTheme };
export default byggTheme;
```

### e) Stiluri proprii
`themes/bygg/src/styles.css` — doar regulile noi (folosește variabilele `--sk-*`,
nu culori hardcodate). Se importă după `theme-light/styles.css`.

### f) Înregistrează tema în starter
În `apps/starter/staark.config.ts` adaugi tema în `THEMES`:

```ts
import byggTheme, { byggRegistry } from "@staark/theme-bygg";
// ...
const THEMES = {
  light:  { theme: lightTheme },
  salong: { theme: salongTheme, registry: salongRegistry },
  bygg:   { theme: byggTheme,   registry: byggRegistry },
};
```

Adaugi dependința în `apps/starter/package.json`
(`"@staark/theme-bygg": "workspace:*"`) și în `transpilePackages` din
`next.config.ts`. Apoi `pnpm install` și `STAARK_THEME=bygg` în `.env.local`.

> **Gästfrihet** e la fel, doar că are **două presets** în același folder
> (`restaurang.json` + `hotell.json`), iar `defaultPreset` e unul dintre ele.
> Preseturile sunt deja în repo-ul WordPress — copiază-le ca atare.

---

## 2. Date / conținut nou

### Acum (fixtures, fără Hub)
Conținutul e în `apps/starter/content/`:
- `site.json` — setări site (nume, brand, contact, **navigation**, `theme.preset`, SEO).
- `pages/*.json` — o pagină per fișier. Fiecare are `path`, `title`, `seo`, `blocks[]`.

O pagină nouă = un fișier nou în `pages/`. Fiecare **block** are:
```json
{ "id": "unic", "type": "numeSectiune", "props": { ... } }
```
`type` trebuie să existe în registrul temei active (`hero`, `services`,
`process`, `testimonials`, `cta`, `contact`, plus ale temei copil: `priceList`,
`gallery`, etc.). `props` e validat de schema secțiunii — dacă lipsește un câmp
obligatoriu, build-ul pică cu un mesaj clar.

Ca să vezi ce props acceptă o secțiune, deschide fișierul ei și citește `schema`
(e sursa de adevăr).

### Mai târziu (Hub real)
Aceleași shape-uri vin din Hub prin API. Pui în `.env.local`:
```
STAARK_CONTENT_SOURCE=hub
STAARK_SITE_ID=...
STAARK_SITE_SECRET=...
```
Hub-ul trebuie să expună endpointurile din `docs/HUB-CONTENT-API.md`. Fixtures și
Hub sunt interschimbabile — dacă un site merge pe fixtures, merge și pe Hub cu
aceleași date.

---

## 3. Checklist după fiecare schimbare
```bash
pnpm typecheck   # tipuri
pnpm build       # build complet + validare fixtures
pnpm test        # semnătură HMAC + token formular
```

## 4. Contractul de modelare a datelor
Toate shape-urile (SiteSettings, Page, Block, FormSubmission) sunt în
`packages/core/src/schema.ts`. Dacă un câmp nou trebuie să existe în conținut,
acolo îl adaugi — și în Hub, și în secțiunea care îl folosește.

---

### Rezumat foarte scurt
- **Temă copil** = `package.json` + `preset.json` + secțiuni + `index.ts` cu `parentId: "light"` + înregistrare în `staark.config.ts`.
- **Pagină nouă** = un `.json` în `content/pages/` cu blocks care referă secțiuni existente.
- **Secțiune nouă** = o funcție `{ props, ctx }` cu schema Zod, adăugată în `sections` al temei.
- Mereu culori/spacing prin variabile `--sk-*`, niciodată hardcodate.
