import {
  blockDefinitionToLegacyTemplate,
  defineBlock,
  type BlockDefinition,
  type BlockField,
} from "@staark/theme-kit";

const EYEBROW: BlockField = {
  name: "eyebrow",
  label: "Eyebrow",
  type: "text",
  help: "Small label above the heading.",
};

const HEADING: BlockField = {
  name: "heading",
  label: "Heading",
  type: "text",
};

const INTRO: BlockField = {
  name: "intro",
  label: "Intro",
  type: "textarea",
};

const list = (
  name: string,
  label: string,
  item: string,
): BlockField => ({
  name,
  label,
  type: "array",
  itemLabel: "{value}",
  fields: [{ name: "value", label: item, type: "text" }],
});

/**
 * Blocks v2 source of truth for Skönhet-owned blocks.
 *
 * Hero remains a parent Light block with Skönhet-specific field extensions in
 * admin.ts. Theme-owned blocks live here so picker metadata, editor fields,
 * required fields and defaults cannot drift apart.
 */
export const skonhetBlockDefinitions = [
  defineBlock({
    type: "treatmentCatalog",
    label: "Treatment catalog",
    description:
      "Salon treatments grouped by category. Services, prices and duration come from Admin → Services & prices.",
    icon: "sparkles",
    category: "services",
    version: 2,
    // Business data is hydrated from Admin → Services & prices. Keep this
    // block non-editable in the generic field form for now.
    fields: [],
    required: [],
    defaults: {
      eyebrow: "Behandlingar",
    },
  }),

  defineBlock({
    type: "serviceMenu",
    label: "Service menu",
    description: "Treatments in tabs with duration, price and a 'Boka' link.",
    icon: "receipt",
    category: "services",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "categories",
        label: "Categories (tabs)",
        type: "array",
        itemLabel: "{name}",
        fields: [
          {
            name: "name",
            label: "Tab name",
            type: "text",
            placeholder: "Naglar",
          },
          {
            name: "note",
            label: "Note",
            type: "text",
            help: "Short line above the list, e.g. 'Priser inkl. borttagning'.",
          },
          {
            name: "items",
            label: "Treatments",
            type: "array",
            itemLabel: "{name}",
            fields: [
              { name: "name", label: "Name", type: "text" },
              {
                name: "description",
                label: "Description",
                type: "text",
              },
              {
                name: "duration",
                label: "Duration",
                type: "text",
                placeholder: "60 min",
              },
              {
                name: "price",
                label: "Price",
                type: "text",
                placeholder: "595",
                format: "sek-from",
                help: "Enter the amount only. Example: 595 → från 595 kr.",
              },
              {
                name: "bookable",
                label: "Show 'Boka' link",
                type: "boolean",
              },
            ],
          },
        ],
      },
      {
        name: "bookHref",
        label: "Booking link",
        type: "text",
        placeholder: "#boka",
      },
      {
        name: "bookLabel",
        label: "Booking label",
        type: "text",
        placeholder: "Boka",
      },
      { name: "footnote", label: "Footnote", type: "text" },
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Behandlingar",
      heading: "Meny & priser",
      categories: [
        {
          name: "Hår",
          items: [
            {
              name: "Klippning",
              duration: "45 min",
              price: "från 595 kr",
              bookable: true,
            },
          ],
        },
        {
          name: "Naglar",
          items: [
            {
              name: "Gelémanikyr",
              duration: "60 min",
              price: "595 kr",
              bookable: true,
            },
          ],
        },
      ],
    },
  }),

  defineBlock({
    type: "stylists",
    label: "Stylists",
    description: "Team cards with specialties and 'Boka med' links.",
    icon: "users",
    category: "team",
    version: 2,
    fields: [
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
          {
            name: "role",
            label: "Role",
            type: "text",
            placeholder: "Frisör · Färgspecialist",
          },
          { name: "image", label: "Photo", type: "image" },
          list("specialties", "Specialties", "Specialty"),
          {
            name: "bookable",
            label: "Show 'Boka med' link",
            type: "boolean",
          },
        ],
      },
      {
        name: "bookHref",
        label: "Booking link",
        type: "text",
        placeholder: "#boka",
      },
      {
        name: "bookLabel",
        label: "Booking label",
        type: "text",
        placeholder: "Boka med",
      },
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Teamet",
      heading: "Våra stylister",
      people: [
        {
          name: "Förnamn Efternamn",
          role: "Frisör",
          specialties: [],
        },
      ],
    },
  }),

  defineBlock({
    type: "lookbook",
    label: "Lookbook",
    description: "Recent work with category filters.",
    icon: "image",
    category: "media",
    version: 2,
    fields: [
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
          {
            name: "category",
            label: "Category (filter)",
            type: "text",
            placeholder: "Naglar",
          },
          { name: "caption", label: "Caption", type: "text" },
        ],
      },
      {
        name: "allLabel",
        label: "'All' filter label",
        type: "text",
        placeholder: "Allt",
      },
      { name: "cta", label: "Button", type: "link" },
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Lookbook",
      heading: "Senaste jobben",
      items: [],
    },
  }),

  defineBlock({
    type: "bookingRequest",
    label: "Booking request",
    description: "Three-step booking form that lands in S-Hub Inbox as a booking.",
    icon: "calendar",
    category: "forms",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "formId",
        label: "Form ID",
        type: "text",
        help: "Identifies the form in the Inbox.",
      },
      list("services", "Treatments", "Treatment"),
      list("stylists", "Stylists", "Name"),
      list("times", "Time options (HH:MM)", "Time"),
      { name: "submitLabel", label: "Submit label", type: "text" },
      {
        name: "successMessage",
        label: "Success message",
        type: "text",
      },
      {
        name: "policy",
        label: "Cancellation policy",
        type: "textarea",
      },
      {
        name: "externalBooking",
        label: "External booking link",
        type: "link",
        help: "Optional, e.g. Bokadirekt.",
      },
    ],
    required: ["heading", "formId", "services"],
    defaults: {
      eyebrow: "Boka",
      heading: "Boka din tid",
      formId: "skonhet-bokning",
      services: ["Klippning", "Gelémanikyr"],
      times: ["10:00", "12:00", "14:00", "16:00", "18:00"],
    },
  }),
] satisfies readonly BlockDefinition[];

/**
 * Compatibility exports for consumers that have not moved to Blocks v2 yet.
 * They are derived from the definitions above, so there is still one source of
 * truth during the migration.
 */
export const skonhetBlockFields = Object.fromEntries(
  skonhetBlockDefinitions.map((definition) => [
    definition.type,
    [...definition.fields],
  ]),
) as Record<string, BlockField[]>;

export const skonhetRequiredFields = Object.fromEntries(
  skonhetBlockDefinitions.map((definition) => [
    definition.type,
    [...definition.required],
  ]),
) as Record<string, string[]>;

export const skonhetBlockTemplates = skonhetBlockDefinitions.map(
  blockDefinitionToLegacyTemplate,
);
