/**
 * Admin integration for S-Hub Verkstad: field descriptors for the /admin block
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
const ICONS = ["check", "shield", "key", "receipt", "phone", "wrench", "car", "tire", "clock"];

/** Field descriptors per block type (merge into BLOCK_FIELDS). faq matches S-Hub El. */
export const verkstadBlockFields: Record<string, AdminField[]> = {
  promises: [
    EYEBROW,
    { name: "heading", label: "Heading (optional)", type: "text" },
    {
      name: "items",
      label: "Promises",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "text", label: "Text", type: "text" },
        { name: "icon", label: "Icon", type: "select", options: ICONS },
      ],
    },
  ],
  priceTable: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "columns", label: "Price columns", type: "array", itemLabel: "{value}", help: "E.g. Småbil, Mellanklass, SUV / stor.", fields: [{ name: "value", label: "Column", type: "text" }] },
    {
      name: "groups",
      label: "Groups",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Group title", type: "text", placeholder: "Däck" },
        {
          name: "rows",
          label: "Services",
          type: "array",
          itemLabel: "{name}",
          fields: [
            { name: "name", label: "Service", type: "text" },
            { name: "note", label: "Note", type: "text" },
            { name: "prices", label: "Prices (one per column)", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Price", type: "text" }] },
          ],
        },
      ],
    },
    { name: "footnote", label: "Footnote", type: "text" },
    { name: "bookHref", label: "Booking link", type: "text", placeholder: "#boka", help: "Empty hides the Boka links." },
    { name: "bookLabel", label: "Booking label", type: "text", placeholder: "Boka" },
  ],
  highlightBand: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "text", label: "Text", type: "textarea" },
    {
      name: "facts",
      label: "Facts",
      type: "array",
      itemLabel: "{label}",
      fields: [
        { name: "label", label: "Label", type: "text" },
        { name: "value", label: "Value", type: "text" },
      ],
    },
    { name: "icon", label: "Icon", type: "select", options: ICONS },
    { name: "cta", label: "Button", type: "link" },
  ],
  serviceBooking: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "formId", label: "Form ID", type: "text", help: "Identifies the form in the Inbox." },
    { name: "services", label: "Services", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Service", type: "text" }] },
    { name: "dropOffTimes", label: "Drop-off times (HH:MM)", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Time", type: "text" }] },
    { name: "loanCar", label: "Offer loan car option", type: "boolean" },
    { name: "notes", label: "How it works (lines)", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Line", type: "text" }] },
    { name: "submitLabel", label: "Submit label", type: "text" },
    { name: "successMessage", label: "Success message", type: "text" },
    { name: "consent", label: "Consent / privacy text", type: "textarea" },
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

/** Extra hero field, only rendered by the Verkstad hero (append to BLOCK_FIELDS.hero). */
export const verkstadHeroFields: AdminField[] = [
  {
    name: "plate",
    label: "Licence plate box (Verkstad)",
    type: "object",
    help: "Replaces the primary button with a registration-number box that opens the booking form prefilled.",
    fields: [
      { name: "label", label: "Label", type: "text", placeholder: "Boka med ditt regnummer" },
      { name: "placeholder", label: "Placeholder", type: "text", placeholder: "ABC 123" },
      { name: "buttonLabel", label: "Button", type: "text", placeholder: "Boka" },
      { name: "href", label: "Booking link", type: "text", placeholder: "#boka" },
    ],
  },
];

/** Required top-level fields per block type (merge into REQUIRED_FIELDS). */
export const verkstadRequiredFields: Record<string, string[]> = {
  promises: [],
  priceTable: ["heading"],
  highlightBand: ["heading"],
  serviceBooking: ["heading", "formId"],
  faq: ["heading"],
};

/** Block-picker templates (THEME_BLOCKS.verkstad). */
export const verkstadBlockTemplates: AdminBlockTemplate[] = [
  {
    type: "promises",
    label: "Promises",
    description: "What customers can count on: fast pris, lånebil, garanti.",
    icon: "shield",
    template: {
      items: [
        { title: "Märkesoberoende", text: "Nybilsgarantin gäller", icon: "shield" },
        { title: "Fast pris", text: "Innan vi börjar", icon: "receipt" },
        { title: "Lånebil", text: "Boka i förväg", icon: "key" },
        { title: "Vi ringer först", text: "Inget extra arbete utan ditt ok", icon: "phone" },
      ],
    },
  },
  {
    type: "priceTable",
    label: "Price table",
    description: "Fixed prices per car size, grouped, with Boka links.",
    icon: "receipt",
    template: {
      eyebrow: "Priser",
      heading: "Fasta priser",
      columns: ["Småbil", "Mellanklass", "SUV / stor"],
      groups: [{ title: "Service", rows: [{ name: "Service", prices: ["2 495 kr", "2 995 kr", "3 495 kr"] }] }],
    },
  },
  {
    type: "highlightBand",
    label: "Highlight band",
    description: "Seasonal or campaign strip, e.g. däckbyte.",
    icon: "megaphone",
    template: { eyebrow: "Säsong", heading: "Dags för däckbyte", icon: "tire", facts: [], cta: { label: "Boka däckbyte", href: "?tjanst=Däckbyte#boka" } },
  },
  {
    type: "serviceBooking",
    label: "Service booking",
    description: "Booking by registration number with services, day and loan car.",
    icon: "calendar",
    template: { eyebrow: "Boka", heading: "Boka verkstadstid", formId: "verkstad-bokning" },
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Questions and answers with FAQ structured data.",
    icon: "message-circle",
    template: { eyebrow: "Frågor", heading: "Vanliga frågor", items: [{ question: "Påverkas nybilsgarantin?", answer: "Svar…" }] },
  },
];

const block = (id: string, type: string, props: Record<string, unknown>) => ({ id, type, props });

/** Page templates offered when creating a page with this theme active. */
export const verkstadPageTemplates: AdminPageTemplate[] = [
  {
    id: "verkstad-prices",
    label: "Price page (Verkstad)",
    description: "Hero, price table and service booking.",
    blocks: (title) => [
      block("hero", "hero", { heading: title, intro: "Fasta priser för vanliga jobb." }),
      block("priser", "priceTable", { heading: "Fasta priser", columns: ["Pris"], groups: [] }),
      block("boka", "serviceBooking", { heading: "Boka verkstadstid", formId: "verkstad-bokning" }),
    ],
  },
];
