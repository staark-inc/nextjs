# Instalare S-Hub El

Pachetul conține tot ce ține de temă: secțiunile, preset-ul, stilurile, fonturile,
definițiile pentru `/admin` și un site demo („Norrsken El”). Aplicația `apps/starter`
trebuie doar să afle că tema există: 5 pași obligatorii și 3 opționali.

Comenzile sunt pentru PowerShell, rulate din rădăcina repo-ului `nextjs`.

## 1. Copiază folderul

Dezarhivează ca să ajungă la `themes/el` (lângă `themes/light`, `themes/salong` …).

## 2. Dependința în starter

În `apps/starter/package.json`, la `dependencies`:

```json
"@staark/theme-el": "workspace:*",
```

## 3. `apps/starter/next.config.ts`

Adaugă `"@staark/theme-el"` în lista `transpilePackages`.

## 4. `apps/starter/lib/theme-runtime.ts`

```ts
import elTheme, { elRegistry } from "@staark/theme-el";

// în obiectul THEMES:
  el: {
    id: "el",
    name: elTheme.name,
    description: "Electrician theme with credentials, ROT & grön teknik calculator, FAQ and quote requests.",
    theme: elTheme,
    registry: elRegistry,
  },
```

## 5. `apps/starter/app/(site)/layout.tsx`

După celelalte importuri de stiluri:

```ts
import "@staark/theme-el/styles.css";
```

Stilurile sunt izolate (`.sk-el-*` și regulile legate de header-ul `el`),
deci nu afectează celelalte teme.

## Instalează și pornește demo-ul

```powershell
pnpm install
Copy-Item -Recurse themes\el\demo\content apps\starter\content\el
Copy-Item -Recurse themes\el\demo\public\el apps\starter\public\el
```

În `apps\starter\.env.local`:

```
STAARK_CONTENT_SOURCE=fixtures
STAARK_THEME=el
STAARK_CONTENT_DIR=content/el
```

```powershell
pnpm dev
```

Deschide http://localhost:3200. Cererile trimise din formularul de rezervare apar
în Inbox-ul din `/admin` ca cereri de ofertă.

## Opțional: integrarea în `/admin`

Fără acești pași site-ul merge normal. Blocks-urile noi se editează atunci ca JSON,
iar pickerul nu le arată.

**a) Formulare pentru blocks** — `apps/starter/lib/block-fields.ts`:

```ts
import { elBlockFields, elHeroFields, elRequiredFields } from "@staark/theme-el/admin";

// în BLOCK_FIELDS.hero, după "points":
    ...(elHeroFields as Field[]),
// la sfârșitul BLOCK_FIELDS:
  ...(elBlockFields as Record<string, Field[]>),
// la sfârșitul REQUIRED_FIELDS:
  ...elRequiredFields,
```

**b) Blocks în picker** — `apps/starter/app/api/admin/blocks/route.ts`:

```ts
import { elBlockTemplates } from "@staark/theme-el/admin";

const THEME_BLOCKS: Record<string, BlockTemplate[]> = {
  el: elBlockTemplates,
  // salong, gastfrihet …
};
```

**c) Template-uri de pagină** — `apps/starter/app/api/admin/pages/route.ts`:

```ts
import { elPageTemplates } from "@staark/theme-el/admin";

// în templatesFor(theme):
  if (theme === "el") {
    base.push(...elPageTemplates.map(({ id, label, description }) => ({ id, label, description, theme })));
  }

// în blocksFor(templateId, title), ramura default:
    default:
      return elPageTemplates.find((t) => t.id === templateId)?.blocks(title) ?? [];
```

Dacă ai instalat și alte teme S-Hub, pune-le pe toate în aceeași listă:
`return [...hantverkPageTemplates, ...skonhetPageTemplates, ...elPageTemplates].find((t) => t.id === templateId)?.blocks(title) ?? [];`

Tema apare și în Theme Studio dacă adaugi `"el"` în `BUILT_IN_THEME_IDS`
din `apps/starter/lib/theme-studio.ts`.

## Verificare

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## Compatibilitate cu Hantverk

`quoteRequest` și `emergencyBanner` au aceleași props ca în S-Hub Hantverk, deci conținutul se mută între cele două teme fără modificări. Dacă le instalezi pe amândouă, definițiile de admin pentru aceste blocks sunt identice.
