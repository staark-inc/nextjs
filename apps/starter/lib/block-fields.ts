/**
 * Field descriptors for the block editor. They turn each block type's props into
 * a proper form (text, textarea, number, toggle, select, image, link, repeatable
 * lists) instead of raw JSON. The shapes mirror the theme section schemas.
 *
 * A block type without a descriptor falls back to the JSON editor automatically,
 * so adding a new block is never blocked on writing one of these.
 */

export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "image" | "link" | "array" | "object";

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
        { name: "icon", label: "Icon", type: "text", help: "An emoji or short symbol." },
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
    { name: "images", label: "Images", type: "array", itemLabel: "{alt}", fields: [{ name: "src", label: "Image URL", type: "text" }, { name: "alt", label: "Alt text", type: "text" }] },
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
        { name: "image", label: "Image URL", type: "text" },
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
        { name: "image", label: "Image URL", type: "text" },
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
        { name: "image", label: "Photo URL", type: "text" },
        { name: "bio", label: "Bio", type: "textarea" },
      ],
    },
  ],
  logos: [
    { name: "heading", label: "Heading", type: "text" },
    { name: "logos", label: "Logos", type: "array", itemLabel: "{name}", fields: [{ name: "name", label: "Name", type: "text" }, { name: "src", label: "Image URL", type: "text" }] },
  ],

  // webb
  featuredProject: [
    EYEBROW,
    { name: "client", label: "Client", type: "text" },
    { name: "title", label: "Title", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Image URL", type: "text" },
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
