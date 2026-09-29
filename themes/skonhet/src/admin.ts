/**
 * Admin integration for S-Hub Skönhet: field descriptors for the /admin block
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
  format?: "sek" | "sek-from";
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
const HEADING: AdminField = { name: "heading", label: "Heading", type: "text" };
const INTRO: AdminField = { name: "intro", label: "Intro", type: "textarea" };
const list = (name: string, label: string, item: string): AdminField => ({
  name,
  label,
  type: "array",
  itemLabel: "{value}",
  fields: [{ name: "value", label: item, type: "text" }],
});

/** Field descriptors per block type (merge into BLOCK_FIELDS). */
export const skonhetBlockFields: Record<string, AdminField[]> = {
  serviceMenu: [
    EYEBROW,
    HEADING,
    INTRO,
    {
      name: "categories",
      label: "Categories (tabs)",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Tab name", type: "text", placeholder: "Naglar" },
        { name: "note", label: "Note", type: "text", help: "Short line above the list, e.g. 'Priser inkl. borttagning'." },
        {
          name: "items",
          label: "Treatments",
          type: "array",
          itemLabel: "{name}",
          fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "description", label: "Description", type: "text" },
            { name: "duration", label: "Duration", type: "text", placeholder: "60 min" },
            { name: "price", label: "Price", type: "text", placeholder: "595", format: "sek-from", help: "Enter the amount only. Example: 595 → från 595 kr." },
            { name: "bookable", label: "Show 'Boka' link", type: "boolean" },
          ],
        },
      ],
    },
    { name: "bookHref", label: "Booking link", type: "text", placeholder: "#boka" },
    { name: "bookLabel", label: "Booking label", type: "text", placeholder: "Boka" },
    { name: "footnote", label: "Footnote", type: "text" },
  ],
  stylists: [
    EYEBROW,
    HEADING,
    INTRO,
    {
      name: "people",
      label: "Stylists",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Name", type: "text" },
        { name: "role", label: "Role", type: "text", placeholder: "Frisör · Färgspecialist" },
        { name: "image", label: "Photo", type: "image" },
        list("specialties", "Specialties", "Specialty"),
        { name: "bookable", label: "Show 'Boka med' link", type: "boolean" },
      ],
    },
    { name: "bookHref", label: "Booking link", type: "text", placeholder: "#boka" },
    { name: "bookLabel", label: "Booking label", type: "text", placeholder: "Boka med" },
  ],
  lookbook: [
    EYEBROW,
    HEADING,
    INTRO,
    {
      name: "items",
      label: "Images",
      type: "array",
      itemLabel: "{alt}",
      fields: [
        { name: "src", label: "Image", type: "imageUrl" },
        { name: "alt", label: "Alt text", type: "text" },
        { name: "category", label: "Category (filter)", type: "text", placeholder: "Naglar" },
        { name: "caption", label: "Caption", type: "text" },
      ],
    },
    { name: "allLabel", label: "'All' filter label", type: "text", placeholder: "Allt" },
    { name: "cta", label: "Button", type: "link" },
  ],
  bookingRequest: [
    EYEBROW,
    HEADING,
    INTRO,
    { name: "formId", label: "Form ID", type: "text", help: "Identifies the form in the Inbox." },
    list("services", "Treatments", "Treatment"),
    list("stylists", "Stylists", "Name"),
    list("times", "Time options (HH:MM)", "Time"),
    { name: "submitLabel", label: "Submit label", type: "text" },
    { name: "successMessage", label: "Success message", type: "text" },
    { name: "policy", label: "Cancellation policy", type: "textarea" },
    { name: "externalBooking", label: "External booking link", type: "link", help: "Optional, e.g. Bokadirekt." },
  ],
};

/** Extra hero fields, only rendered by the Skönhet hero (append to BLOCK_FIELDS.hero). */
export const skonhetHeroFields: AdminField[] = [
  { name: "headingAccent", label: "Heading accent (italic, Skönhet)", type: "text" },
  { name: "detailImage", label: "Detail image (Skönhet)", type: "image" },
  { name: "badge", label: "Badge (Skönhet)", type: "text", placeholder: "−15 % första besöket" },
  { name: "showVisit", label: "Show address & hours (Skönhet)", type: "boolean" },
];

/** Required top-level fields per block type (merge into REQUIRED_FIELDS). */
export const skonhetRequiredFields: Record<string, string[]> = {
  serviceMenu: ["heading"],
  stylists: ["heading"],
  lookbook: ["heading"],
  bookingRequest: ["heading", "formId", "services"],
};

/** Block-picker templates (THEME_BLOCKS.skonhet). */
export const skonhetBlockTemplates: AdminBlockTemplate[

] = [
  {
    type: "treatmentCatalog",
    label: "Treatment catalog",
    description:
      "Salon treatments grouped by category. Services, prices and duration come from Admin → Services & prices.",
    icon: "sparkles",
    template: {
      eyebrow: "Behandlingar",
    },
  },

  {
    type: "serviceMenu",
    label: "Service menu",
    description: "Treatments in tabs with duration, price and a 'Boka' link.",
    icon: "receipt",
    template: {
      eyebrow: "Behandlingar",
      heading: "Meny & priser",
      categories: [
        { name: "Hår", items: [{ name: "Klippning", duration: "45 min", price: "från 595 kr", bookable: true }] },
        { name: "Naglar", items: [{ name: "Gelémanikyr", duration: "60 min", price: "595 kr", bookable: true }] },
      ],
    },
  },
  {
    type: "stylists",
    label: "Stylists",
    description: "Team cards with specialties and 'Boka med' links.",
    icon: "users",
    template: { eyebrow: "Teamet", heading: "Våra stylister", people: [{ name: "Förnamn Efternamn", role: "Frisör", specialties: [] }] },
  },
  {
    type: "lookbook",
    label: "Lookbook",
    description: "Recent work with category filters.",
    icon: "image",
    template: { eyebrow: "Lookbook", heading: "Senaste jobben", items: [] },
  },
  {
    type: "bookingRequest",
    label: "Booking request",
    description: "Three-step booking form that lands in S-Hub Inbox as a booking.",
    icon: "calendar",
    template: {
      eyebrow: "Boka",
      heading: "Boka din tid",
      formId: "skonhet-bokning",
      services: ["Klippning", "Gelémanikyr"],
      times: ["10:00", "12:00", "14:00", "16:00", "18:00"],
    },
  },
];

const block = (id: string, type: string, props: Record<string, unknown>) => ({ id, type, props });

/** Page templates offered when creating a page with this theme active. */
export const skonhetPageTemplates: AdminPageTemplate[] = [
  {
    id: "skonhet-menu",
    label: "Menu & prices page",
    description: "Hero, service menu and booking form.",
    blocks: (title) => [
      block("hero", "hero", { heading: title, intro: "Alla behandlingar och priser." }),
      block("meny", "serviceMenu", { heading: "Meny & priser", categories: [] }),
      block("boka", "bookingRequest", { heading: "Boka din tid", formId: "skonhet-bokning", services: [] }),
    ],
  },
  {
    id: "skonhet-team",
    label: "Team page",
    description: "Hero, stylists and lookbook.",
    blocks: (title) => [
      block("hero", "hero", { heading: title, intro: "Människorna bakom stolarna." }),
      block("team", "stylists", { heading: "Våra stylister", people: [] }),
      block("look", "lookbook", { heading: "Senaste jobben", items: [] }),
    ],
  },
];
