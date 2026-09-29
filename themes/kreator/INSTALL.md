# Instalare S-Hub Kreatör

Pachetul conține tot ce ține de temă: secțiunile, preset-ul, stilurile, fonturile,
definițiile pentru `/admin` și un site demo („Rendo”). Aplicația `apps/starter`
trebuie doar să afle că tema există: 5 pași obligatorii și 3 opționali.

Comenzile sunt pentru PowerShell, rulate din rădăcina repo-ului `nextjs`.

## 1. Copiază folderul

Dezarhivează ca să ajungă la `themes/kreator` (lângă `themes/light`, `themes/salong` …).

## 2. Dependința în starter

În `apps/starter/package.json`, la `dependencies`:

```json
"@staark/theme-kreator": "workspace:*",
```

## 3. `apps/starter/next.config.ts`

Adaugă `"@staark/theme-kreator"` în lista `transpilePackages`.

## 4. `apps/starter/lib/theme-runtime.ts`

```ts
import kreatorTheme, { kreatorRegistry } from "@staark/theme-kreator";

// în obiectul THEMES:
  kreator: {
    id: "kreator",
    name: kreatorTheme.name,
    description: "Streamer & creator theme with partner codes, stream schedule, setup, videos and socials.",
    theme: kreatorTheme,
    registry: kreatorRegistry,
  },
```

## 5. `apps/starter/app/(site)/layout.tsx`

După celelalte importuri de stiluri:

```ts
import "@staark/theme-kreator/styles.css";
```

Stilurile sunt izolate (`.sk-kr-*` și regulile legate de header-ul `kreator`),
deci nu afectează celelalte teme.

## Instalează și pornește demo-ul

```powershell
pnpm install
Copy-Item -Recurse themes\kreator\demo\content apps\starter\content\kreator
Copy-Item -Recurse themes\kreator\demo\public\kreator apps\starter\public\kreator
```

În `apps\starter\.env.local`:

```
STAARK_CONTENT_SOURCE=fixtures
STAARK_THEME=kreator
STAARK_CONTENT_DIR=content/kreator
```

```powershell
pnpm dev
```

Deschide http://localhost:3200. Cererile de colaborare din formularul de contact apar
în Inbox-ul din `/admin`.

## Opțional: integrarea în `/admin`

Fără acești pași site-ul merge normal. Blocks-urile noi se editează atunci ca JSON,
iar pickerul nu le arată.

**a) Formulare pentru blocks** — `apps/starter/lib/block-fields.ts`:

```ts
import { kreatorBlockFields, kreatorHeroFields, kreatorRequiredFields } from "@staark/theme-kreator/admin";

// în BLOCK_FIELDS.hero, după "points":
    ...(kreatorHeroFields as Field[]),
// la sfârșitul BLOCK_FIELDS:
  ...(kreatorBlockFields as Record<string, Field[]>),
// la sfârșitul REQUIRED_FIELDS:
  ...kreatorRequiredFields,
```

**b) Blocks în picker** — `apps/starter/app/api/admin/blocks/route.ts`:

```ts
import { kreatorBlockTemplates } from "@staark/theme-kreator/admin";

const THEME_BLOCKS: Record<string, BlockTemplate[]> = {
  kreator: kreatorBlockTemplates,
  // salong, gastfrihet …
};
```

**c) Template-uri de pagină** — `apps/starter/app/api/admin/pages/route.ts`:

```ts
import { kreatorPageTemplates } from "@staark/theme-kreator/admin";

// în templatesFor(theme):
  if (theme === "kreator") {
    base.push(...kreatorPageTemplates.map(({ id, label, description }) => ({ id, label, description, theme })));
  }

// în blocksFor(templateId, title), ramura default:
    default:
      return kreatorPageTemplates.find((t) => t.id === templateId)?.blocks(title) ?? [];
```

Dacă ai instalat și alte teme S-Hub, pune-le pe toate în aceeași listă:
`return [...hantverkPageTemplates, ...skonhetPageTemplates, ...elPageTemplates, ...verkstadPageTemplates, ...kreatorPageTemplates].find((t) => t.id === templateId)?.blocks(title) ?? [];`

Tema apare și în Theme Studio dacă adaugi `"kreator"` în `BUILT_IN_THEME_IDS`
din `apps/starter/lib/theme-studio.ts`.

## Verificare

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## De știut

- Preset-ul e **întunecat**. Secțiunile din S-Hub Light (contact, testimoniale, cta …) sunt adaptate automat pe paginile cu header-ul `kreator`.
- Statusul „Live” din hero e **text static** (`status`, `statusLive`), setat din `/admin` sau din Hub. Tema nu verifică live-ul pe Kick/YouTube.
- Iconițele de platformă sunt glife generice (play, antenă, cameră …) lângă numele platformei, nu logo-urile oficiale.
- Linkurile de la parteneri au `rel="sponsored"`, iar block-ul `partnerCodes` afișează un text de reclamă (`disclosure`). Păstrează-l: marcarea reclamei e obligatorie pentru linkuri afiliate.
- Formularul de contact din Light are ancora fixă `#kontakt`, deci linkurile din meniu către formular trebuie să fie `/#kontakt`.
