# Instalare S-Hub Skönhet

Pachetul conține tot ce ține de temă: secțiunile, preset-ul, stilurile, fonturile,
definițiile pentru `/admin` și un site demo („Studio Lumi”). Aplicația `apps/starter`
trebuie doar să afle că tema există: 5 pași obligatorii și 3 opționali.

Comenzile sunt pentru PowerShell, rulate din rădăcina repo-ului `nextjs`.

## 1. Copiază folderul

Dezarhivează ca să ajungă la `themes/skonhet` (lângă `themes/light`, `themes/salong` …).

## 2. Dependința în starter

În `apps/starter/package.json`, la `dependencies`:

```json
"@staark/theme-skonhet": "workspace:*",
```

## 3. `apps/starter/next.config.ts`

Adaugă `"@staark/theme-skonhet"` în lista `transpilePackages`.

## 4. `apps/starter/lib/theme-runtime.ts`

```ts
import skonhetTheme, { skonhetRegistry } from "@staark/theme-skonhet";

// în obiectul THEMES:
  skonhet: {
    id: "skonhet",
    name: skonhetTheme.name,
    description: "Hair & nail studio theme with tabbed service menu, stylists, lookbook and booking requests.",
    theme: skonhetTheme,
    registry: skonhetRegistry,
  },
```

## 5. `apps/starter/app/(site)/layout.tsx`

După celelalte importuri de stiluri:

```ts
import "@staark/theme-skonhet/styles.css";
```

Stilurile sunt izolate (`.sk-sb-*` și regulile legate de header-ul `skonhet`),
deci nu afectează celelalte teme.

## Instalează și pornește demo-ul

```powershell
pnpm install
Copy-Item -Recurse themes\skonhet\demo\content apps\starter\content\skonhet
Copy-Item -Recurse themes\skonhet\demo\public\skonhet apps\starter\public\skonhet
```

În `apps\starter\.env.local`:

```
STAARK_CONTENT_SOURCE=fixtures
STAARK_THEME=skonhet
STAARK_CONTENT_DIR=content/skonhet
```

```powershell
pnpm dev
```

Deschide http://localhost:3200. Cererile trimise din formularul de rezervare apar
în Inbox-ul din `/admin` ca rezervări (status „pending”).

## Opțional: integrarea în `/admin`

Fără acești pași site-ul merge normal. Blocks-urile noi se editează atunci ca JSON,
iar pickerul nu le arată.

**a) Formulare pentru blocks** — `apps/starter/lib/block-fields.ts`:

```ts
import { skonhetBlockFields, skonhetHeroFields, skonhetRequiredFields } from "@staark/theme-skonhet/admin";

// în BLOCK_FIELDS.hero, după "points":
    ...(skonhetHeroFields as Field[]),
// la sfârșitul BLOCK_FIELDS:
  ...(skonhetBlockFields as Record<string, Field[]>),
// la sfârșitul REQUIRED_FIELDS:
  ...skonhetRequiredFields,
```

**b) Blocks în picker** — `apps/starter/app/api/admin/blocks/route.ts`:

```ts
import { skonhetBlockTemplates } from "@staark/theme-skonhet/admin";

const THEME_BLOCKS: Record<string, BlockTemplate[]> = {
  skonhet: skonhetBlockTemplates,
  // salong, gastfrihet …
};
```

**c) Template-uri de pagină** — `apps/starter/app/api/admin/pages/route.ts`:

```ts
import { skonhetPageTemplates } from "@staark/theme-skonhet/admin";

// în templatesFor(theme):
  if (theme === "skonhet") {
    base.push(...skonhetPageTemplates.map(({ id, label, description }) => ({ id, label, description, theme })));
  }

// în blocksFor(templateId, title), ramura default:
    default:
      return skonhetPageTemplates.find((t) => t.id === templateId)?.blocks(title) ?? [];
```

Dacă ai instalat și Hantverk, ramura default devine:
`return [...hantverkPageTemplates, ...skonhetPageTemplates].find((t) => t.id === templateId)?.blocks(title) ?? [];`

Tema apare și în Theme Studio dacă adaugi `"skonhet"` în `BUILT_IN_THEME_IDS`
din `apps/starter/lib/theme-studio.ts`.

## Verificare

```powershell
pnpm typecheck
pnpm test
pnpm build
```
