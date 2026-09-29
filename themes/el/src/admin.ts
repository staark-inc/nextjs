/**
 * Admin integration for S-Hub El: field descriptors for the /admin block
 * editor, required fields, block-picker templates and page templates. Plain
 * data, so the starter app can spread it into its own registries without the
 * theme depending on the app. See INSTALL.md.
 */

export type AdminField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "image" | "imageUrl" | "icon" | "link" | "array" | "object";
  help?: string;
  placeholder?: string;
  options?: (string | number | { label: string; value: string | number })[];
  min?: number;
  max?: number;
  itemLabel?: string;
  fields?: AdminField[];
};

export type AdminBlockTemplate = {
  type: string;
  label: string;
  description: string;
  icon: string;
  template: Record<string, unknown>;
};

export type AdminPageTemplate = {
  id: string;
  label: string;
  description: string;
  blocks: (title: string) => { id: string; type: string; props: Record<string, unknown> }[];
};

const EYEBROW: AdminField = { name: "eyebrow", label: "Eyebrow", type: "text", help: "Small label above the heading." };

/** Field descriptors per block type (merge into BLOCK_FIELDS). emergencyBanner and quoteRequest match S-Hub Hantverk. */
export const elBlockFields: Record<string, AdminField[]> = {
  emergencyBanner: [
    { name: "text", label: "Text", type: "text", placeholder: "Jour dygnet runt vid strömavbrott" },
    { name: "phone", label: "Phone", type: "text", help: "Leave empty to use the site phone number." },
    { name: "note", label: "Note", type: "text", help: "Short extra line, e.g. F-skatt · Org.nr. Hidden on phones." },
    {
      name: "mobileBar",
      label: "Mobile call/quote bar",
      type: "object",
      fields: [
        { name: "enabled", label: "Show on phones", type: "boolean" },
        { name: "callLabel", label: "Call label", type: "text", placeholder: "Ring" },
        { name: "quoteLabel", label: "Quote label", type: "text", placeholder: "Begär offert" },
        { name: "quoteHref", label: "Quote link", type: "text", placeholder: "#offert" },
      ],
    },
  ],
  quoteRequest: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "formId", label: "Form ID", type: "text", help: "Identifies the form in the Inbox." },
    { name: "areasLabel", label: "Areas label", type: "text", placeholder: "Vi arbetar i" },
    { name: "areas", label: "Service areas", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Area", type: "text" }] },
    { name: "jobTypes", label: "Job types", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Job type", type: "text" }] },
    { name: "timings", label: "Start options", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Option", type: "text" }] },
    { name: "submitLabel", label: "Submit label", type: "text" },
    { name: "successMessage", label: "Success message", type: "text" },
    { name: "consent", label: "Consent / privacy text", type: "textarea" },
  ],
  credentials: [
    {
      name: "items",
      label: "Credentials",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "text", label: "Text", type: "text" },
      ],
    },
    { name: "registration", label: "Registration line", type: "text", placeholder: "Registrerat elinstallationsföretag · Org.nr …" },
    { name: "verify", label: "Verify link", type: "link", help: "Link to the public register so customers can check you." },
  ],
  deductionCalculator: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "points", label: "Bullet points", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Point", type: "text" }] },
    {
      name: "options",
      label: "Job types",
      type: "array",
      itemLabel: "{label}",
      help: "2026: laddbox 50 %, batterilager 50 %, solceller 15 % (grön teknik); ROT 30 %.",
      fields: [
        { name: "label", label: "Label", type: "text" },
        { name: "kind", label: "Deduction", type: "select", options: [{ label: "Grön teknik (arbete + material)", value: "green" }, { label: "ROT (arbete)", value: "rot" }] },
        { name: "rate", label: "Rate (%)", type: "number", min: 0, max: 100 },
        { name: "defaultLabor", label: "Default labour (kr)", type: "number", min: 0 },
        { name: "defaultMaterial", label: "Default material (kr)", type: "number", min: 0 },
      ],
    },
    { name: "capPerPerson", label: "Max per person and year (kr)", type: "number", min: 0 },
    { name: "maxAmount", label: "Slider max (kr)", type: "number", min: 10000 },
    { name: "note", label: "Fine print", type: "text" },
  ],
  faq: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "items",
      label: "Questions",
      type: "array",
      itemLabel: "{question}",
      fields: [
        { name: "question", label: "Question", type: "text" },
        { name: "answer", label: "Answer", type: "textarea" },
      ],
    },
    { name: "structuredData", label: "Add FAQ structured data (SEO)", type: "boolean" },
  ],
};

/** Extra hero fields, only rendered by the El hero (append to BLOCK_FIELDS.hero). */
export const elHeroFields: AdminField[] = [
  { name: "highlight", label: "Highlighted words (El)", type: "text", help: "Must appear in the heading; drawn with the yellow marker." },
  { name: "authorization", label: "Authorization line (El)", type: "text", placeholder: "Auktoriserat elinstallationsföretag" },
];

/** Required top-level fields per block type (merge into REQUIRED_FIELDS). */
export const elRequiredFields: Record<string, string[]> = {
  emergencyBanner: [],
  quoteRequest: ["heading", "formId"],
  credentials: [],
  deductionCalculator: ["heading"],
  faq: ["heading"],
};

/** Block-picker templates (THEME_BLOCKS.el). */
export const elBlockTemplates: AdminBlockTemplate[] = [
  {
    type: "emergencyBanner",
    label: "Jour banner",
    description: "Jour strip under the header plus a sticky call/quote bar on phones.",
    icon: "phone",
    template: { text: "Jour dygnet runt vid strömavbrott", mobileBar: { enabled: true, quoteHref: "#offert" } },
  },
  {
    type: "credentials",
    label: "Credentials",
    description: "Authorization, insurance and a link to the public register.",
    icon: "shield",
    template: {
      items: [
        { title: "Auktoriserad elinstallatör", text: "Behörighet enligt Elsäkerhetsverket" },
        { title: "Ansvarsförsäkring", text: "För allt arbete vi utför" },
        { title: "Garanti", text: "På arbete och material" },
      ],
      verify: { label: "Kontrollera oss hos Elsäkerhetsverket", href: "https://www.elsakerhetsverket.se/" },
    },
  },
  {
    type: "deductionCalculator",
    label: "ROT & grön teknik",
    description: "Price after ROT or grön teknik deduction, with editable rates.",
    icon: "calculator",
    template: { eyebrow: "Avdrag", heading: "Vad kostar det efter avdrag?", capPerPerson: 50000 },
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Questions and answers with FAQ structured data.",
    icon: "message-circle",
    template: { eyebrow: "Frågor", heading: "Vanliga frågor", items: [{ question: "Får jag byta ett vägguttag själv?", answer: "Svar…" }] },
  },
  {
    type: "quoteRequest",
    label: "Quote request",
    description: "Three-step quote form (job, details, contact) that lands in S-Hub Inbox.",
    icon: "clipboard",
    template: { eyebrow: "Offert", heading: "Berätta vad du behöver", formId: "el-offert", areas: [] },
  },
];

const block = (id: string, type: string, props: Record<string, unknown>) => ({ id, type, props });

/** Page templates offered when creating a page with this theme active. */
export const elPageTemplates: AdminPageTemplate[] = [
  {
    id: "el-service",
    label: "Service page (El)",
    description: "Hero, credentials, deduction calculator, FAQ and quote form.",
    blocks: (title) => [
      block("hero", "hero", { heading: title, intro: "Beskriv tjänsten kort och tydligt." }),
      block("cred", "credentials", { items: [] }),
      block("avdrag", "deductionCalculator", { heading: "Vad kostar det efter avdrag?" }),
      block("fragor", "faq", { heading: "Vanliga frågor", items: [] }),
      block("offert", "quoteRequest", { heading: "Begär offert", formId: "el-offert" }),
    ],
  },
];
