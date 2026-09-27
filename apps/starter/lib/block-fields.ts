/**
 * Field descriptors for the block editor. They turn each block type's props into
 * a proper form (text, textarea, number, toggle, select, image, link, repeatable
 * lists) instead of raw JSON. The shapes mirror the theme section schemas.
 *
 * A block type without a descriptor falls back to the JSON editor automatically,
 * so adding a new block is never blocked on writing one of these.
 */

export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "image" | "imageUrl" | "icon" | "link" | "array" | "object";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  /** select options; a bare string/number is both label and value. */
  options?: (string | number | { label: string; value: string | number })[];
  min?: number;
  max?: number;
  /** array: per-item heading; "{field}" is replaced by that item field's value. */
  itemLabel?: string;
  /** array item fields, or object sub-fields. */
  fields?: Field[];
}

const CTA: Field = { name: "cta", label: "Button", type: "link" };
const EYEBROW: Field = { name: "eyebrow", label: "Eyebrow", type: "text", help: "Small label above the heading." };

export const BLOCK_FIELDS: Record<string, Field[]> = {
  hero: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "primaryCta", label: "Primary button", type: "link" },
    { name: "secondaryCta", label: "Secondary button", type: "link" },
    { name: "image", label: "Image", type: "image" },
    { name: "points", label: "Bullet points", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Point", type: "text" }] },
  ],
  freeform: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "text", label: "Text", type: "textarea", help: "Plain text. Line breaks are preserved." },
    { name: "image", label: "Image", type: "image" },
    { name: "imagePosition", label: "Image position", type: "select", options: ["left", "right", "top", "background"] },
    { name: "primaryCta", label: "Primary button", type: "link" },
    { name: "secondaryCta", label: "Secondary button", type: "link" },
    { name: "alignment", label: "Text alignment", type: "select", options: ["left", "center", "right"] },
    { name: "width", label: "Content width", type: "select", options: ["narrow", "normal", "wide"] },
    { name: "background", label: "Background", type: "select", options: ["default", "surface", "accent", "dark"] },
  ],
  services: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "columns", label: "Columns", type: "select", options: [2, 3, 4] },
    {
      name: "items",
      label: "Services",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "icon", label: "Icon", type: "icon", help: "Choose a symbol or select an SVG/image from Media." },
        { name: "description", label: "Description", type: "textarea" },
        { name: "price", label: "Price", type: "text" },
      ],
    },
  ],
  process: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    {
      name: "steps",
      label: "Steps",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
      ],
    },
  ],
  testimonials: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    {
      name: "items",
      label: "Testimonials",
      type: "array",
      itemLabel: "{author}",
      fields: [
        { name: "quote", label: "Quote", type: "textarea" },
        { name: "author", label: "Author", type: "text" },
        { name: "role", label: "Role", type: "text" },
        { name: "rating", label: "Rating (1–5)", type: "number", min: 1, max: 5 },
      ],
    },
  ],
  cta: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    CTA,
  ],
  contact: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "formId", label: "Form ID", type: "text", help: "Identifies the form in the Inbox." },
    { name: "submitLabel", label: "Submit button label", type: "text" },
    { name: "successMessage", label: "Success message", type: "text" },
    {
      name: "fields",
      label: "Form fields",
      type: "array",
      itemLabel: "{label}",
      fields: [
        { name: "name", label: "Name (key)", type: "text" },
        { name: "label", label: "Label", type: "text" },
        { name: "type", label: "Type", type: "select", options: ["text", "email", "tel", "textarea", "date", "time", "number"] },
        { name: "required", label: "Required", type: "boolean" },
      ],
    },
  ],

  // salong
  priceList: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "categories",
      label: "Categories",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Category name", type: "text" },
        {
          name: "items",
          label: "Items",
          type: "array",
          itemLabel: "{name}",
          fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "description", label: "Description", type: "text" },
            { name: "price", label: "Price", type: "text" },
            { name: "duration", label: "Duration", type: "text" },
          ],
        },
      ],
    },
  ],
  gallery: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "images", label: "Images", type: "array", itemLabel: "{alt}", fields: [{ name: "src", label: "Image URL", type: "imageUrl" }, { name: "alt", label: "Alt text", type: "text" }] },
  ],

  // gastfrihet
  rooms: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "rooms",
      label: "Rooms",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Name", type: "text" },
        { name: "image", label: "Image URL", type: "imageUrl" },
        { name: "occupancy", label: "Occupancy", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "price", label: "Price", type: "text" },
        { name: "amenities", label: "Amenities", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Amenity", type: "text" }] },
        { name: "href", label: "Link", type: "text" },
      ],
    },
  ],
  amenities: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "items", label: "Amenities", type: "array", itemLabel: "{label}", fields: [{ name: "label", label: "Label", type: "text" }, { name: "icon", label: "Icon", type: "text" }] },
  ],

  // byra
  stats: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "items", label: "Stats", type: "array", itemLabel: "{label}", fields: [{ name: "value", label: "Value", type: "text" }, { name: "label", label: "Label", type: "text" }] },
  ],
  caseStudies: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "items",
      label: "Case studies",
      type: "array",
      itemLabel: "{title}",
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "client", label: "Client", type: "text" },
        { name: "result", label: "Result", type: "textarea" },
        { name: "tags", label: "Tags", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Tag", type: "text" }] },
        { name: "image", label: "Image URL", type: "imageUrl" },
        { name: "href", label: "Link", type: "text" },
        { name: "span", label: "Width", type: "select", options: [{ label: "Half", value: 2 }, { label: "Full", value: 1 }] },
      ],
    },
  ],
  team: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "members",
      label: "Members",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Name", type: "text" },
        { name: "role", label: "Role", type: "text" },
        { name: "image", label: "Photo URL", type: "imageUrl" },
        { name: "bio", label: "Bio", type: "textarea" },
      ],
    },
  ],
  logos: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "logos", label: "Logos", type: "array", itemLabel: "{name}", fields: [{ name: "name", label: "Name", type: "text" }, { name: "src", label: "Image URL", type: "imageUrl" }] },
  ],

  // webb
  featuredProject: [
    EYEBROW,
    { name: "client", label: "Client", type: "text" },
    { name: "title", label: "Title", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Image URL", type: "imageUrl" },
    { name: "result", label: "Result badge", type: "text" },
    { name: "tags", label: "Tags", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Tag", type: "text" }] },
    CTA,
  ],
  pricing: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    {
      name: "plans",
      label: "Plans",
      type: "array",
      itemLabel: "{name}",
      fields: [
        { name: "name", label: "Name", type: "text" },
        { name: "price", label: "Price", type: "text" },
        { name: "period", label: "Period", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "features", label: "Features", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Feature", type: "text" }] },
        { name: "cta", label: "Button", type: "link" },
        { name: "featured", label: "Highlighted", type: "boolean" },
      ],
    },
    { name: "note", label: "Note", type: "text" },
  ],
  serviceAreas: [
    EYEBROW,
    { name: "heading", label: "Heading", type: "text" },
    { name: "intro", label: "Intro", type: "textarea" },
    { name: "areas", label: "Areas", type: "array", itemLabel: "{value}", fields: [{ name: "value", label: "Area", type: "text" }] },
    { name: "note", label: "Note", type: "text" },
  ],
};

/** Some array fields wrap a single scalar as { value } for editing; unwrap on the way out. */
export function isScalarWrapper(fields?: Field[]): boolean {
  return Array.isArray(fields) && fields.length === 1 && fields[0]!.name === "value";
}

/** Required top-level fields per block type — the minimum a block needs to render well. */
export const REQUIRED_FIELDS: Record<string, string[]> = {
  hero: ["heading"],
  freeform: [],
  services: ["heading"],
  process: ["heading"],
  cta: ["heading"],
  contact: ["heading", "formId"],
  priceList: ["heading"],
  gallery: [],
  rooms: ["heading"],
  amenities: ["heading"],
  stats: [],
  caseStudies: ["heading"],
  team: ["heading"],
  logos: [],
  featuredProject: ["title"],
  pricing: ["heading"],
  serviceAreas: ["heading"],
};

export interface FieldError {
  /** Top-level field name, so the editor can show the error inline. */
  field: string;
  message: string;
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/** Validate a block's props against its required fields. Empty array = valid. */
export function validateBlock(type: string, props: Record<string, unknown> | undefined): FieldError[] {
  const required = REQUIRED_FIELDS[type];
  if (!required) return [];
  const fields = BLOCK_FIELDS[type] ?? [];
  const errors: FieldError[] = [];
  for (const name of required) {
    if (isEmpty(props?.[name])) {
      const label = fields.find((f) => f.name === name)?.label ?? name;
      errors.push({ field: name, message: `${label} is required.` });
    }
  }
  return errors;
}

/** Validate every block on a page. Returns errors keyed by block id. */
export function validateBlocks(blocks: { id: string; type: string; props: Record<string, unknown> }[]): Record<string, FieldError[]> {
  const out: Record<string, FieldError[]> = {};
  for (const block of blocks) {
    const errs = validateBlock(block.type, block.props);
    if (errs.length) out[block.id] = errs;
  }
  return out;
}
