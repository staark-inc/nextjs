# Instalare S-Hub Verkstad

Pachetul conține tot ce ține de temă: secțiunile, preset-ul, stilurile, fonturile,
definițiile pentru `/admin` și un site demo („Motorhallen”). Aplicația `apps/starter`
trebuie doar să afle că tema există: 5 pași obligatorii și 3 opționali.

Comenzile sunt pentru PowerShell, rulate din rădăcina repo-ului `nextjs`.

## 1. Copiază folderul

Dezarhivează ca să ajungă la `themes/verkstad` (lângă `themes/light`, `themes/salong` …).

## 2. Dependința în starter

În `apps/starter/package.json`, la `dependencies`:

```json
"@staark/theme-verkstad": "workspace:*",
```

## 3. `apps/starter/next.config.ts`

Adaugă `"@staark/theme-verkstad"` în lista `transpilePackages`.

## 4. `apps/starter/lib/theme-runtime.ts`

```ts
import verkstadTheme, { verkstadRegistry } from "@staark/theme-verkstad";

// în obiectul THEMES:
  verkstad: {
    id: "verkstad",
    name: verkstadTheme.name,
    description: "Car workshop theme with licence-plate booking, price table, promises and seasonal band.",
    theme: verkstadTheme,
    registry: verkstadRegistry,
  },
```

## 5. `apps/starter/app/(site)/layout.tsx`

După celelalte importuri de stiluri:

```ts
import "@staark/theme-verkstad/styles.css";
```

Stilurile sunt izolate (`.sk-vk-*` și regulile legate de header-ul `verkstad`),
deci nu afectează celelalte teme.

## Instalează și pornește demo-ul

```powershell
pnpm install
Copy-Item -Recurse themes\verkstad\demo\content apps\starter\content\verkstad
Copy-Item -Recurse themes\verkstad\demo\public\verkstad apps\starter\public\verkstad
```

În `apps\starter\.env.local`:

```
STAARK_CONTENT_SOURCE=fixtures
STAARK_THEME=verkstad
STAARK_CONTENT_DIR=content/verkstad
```

```powershell
pnpm dev
```

Deschide http://localhost:3200. Cererile trimise din formularul de rezervare apar
în Inbox-ul din `/admin` ca rezervări, cu numărul de înmatriculare în câmpul „item”.

## Opțional: integrarea în `/admin`

Fără acești pași site-ul merge normal. Blocks-urile noi se editează atunci ca JSON,
iar pickerul nu le arată.

**a) Formulare pentru blocks** — `apps/starter/lib/block-fields.ts`:

```ts
import { verkstadBlockFields, verkstadHeroFields, verkstadRequiredFields } from "@staark/theme-verkstad/admin";

// în BLOCK_FIELDS.hero, după "points":
    ...(verkstadHeroFields as Field[]),
// la sfârșitul BLOCK_FIELDS:
  ...(verkstadBlockFields as Record<string, Field[]>),
// la sfârșitul REQUIRED_FIELDS:
  ...verkstadRequiredFields,
```

**b) Blocks în picker** — `apps/starter/app/api/admin/blocks/route.ts`:

```ts
import { verkstadBlockTemplates } from "@staark/theme-verkstad/admin";

const THEME_BLOCKS: Record<string, BlockTemplate[]> = {
  verkstad: verkstadBlockTemplates,
  // salong, gastfrihet …
};
```

**c) Template-uri de pagină** — `apps/starter/app/api/admin/pages/route.ts`:

```ts
import { verkstadPageTemplates } from "@staark/theme-verkstad/admin";

// în templatesFor(theme):
  if (theme === "verkstad") {
    base.push(...verkstadPageTemplates.map(({ id, label, description }) => ({ id, label, description, theme })));
  }

// în blocksFor(templateId, title), ramura default:
    default:
      return verkstadPageTemplates.find((t) => t.id === templateId)?.blocks(title) ?? [];
```

Dacă ai instalat și alte teme S-Hub, pune-le pe toate în aceeași listă:
`return [...hantverkPageTemplates, ...skonhetPageTemplates, ...verkstadPageTemplates].find((t) => t.id === templateId)?.blocks(title) ?? [];`

Tema apare și în Theme Studio dacă adaugi `"verkstad"` în `BUILT_IN_THEME_IDS`
din `apps/starter/lib/theme-studio.ts`.

## Verificare

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Compatibilitate cu El

Block-ul `faq` are aceleași props ca în S-Hub El.
