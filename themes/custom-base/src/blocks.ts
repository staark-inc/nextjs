import { z } from "zod";
import { defineBlock, blockDefinitionToLegacyTemplate, type BlockDefinition, type BlockField } from "@staark/theme-kit/block";

const safeHref = z.string().trim().min(1).refine(value =>
  !/[\u0000-\u0020]/.test(value) && (/^(https?:|mailto:|tel:)/i.test(value) || value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))),
  "Use a local path, anchor, HTTPS/HTTP, email or phone link.",
);
const image = z.object({
  src: z.string().refine(value => !/[\u0000-\u0020\\]/.test(value) && (/^https:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//"))), "Use a local image path or HTTPS URL."),
  alt: z.string().min(1), width: z.number().int().positive().default(1200), height: z.number().int().positive().default(900), caption: z.string().default(""),
});
const anchor = z.string().regex(/^[a-z][a-z0-9-]*$/).optional();
const link = z.object({ label: z.string().min(1), href: safeHref });
const heading = z.string().min(1);
const intro = z.string().default("");
const eyebrow = z.string().default("");
const fields: BlockField[] = [
  { name: "eyebrow", label: "Eyebrow", type: "text" },
  { name: "heading", label: "Heading", type: "textarea" },
  { name: "intro", label: "Introduction", type: "textarea" },
];
export const customBaseBlockSchemas = {
  imageText: z.object({ eyebrow, heading, intro, paragraphs: z.array(z.string()).default([]), image: image.optional(), side: z.enum(["left", "right"]).default("left"), anchor }),
  faq: z.object({ eyebrow, heading, intro, items: z.array(z.object({ question: heading, answer: heading })).default([]), openFirst: z.boolean().default(false), anchor }),
  gallery: z.object({ eyebrow, heading, intro, items: z.array(image).default([]), columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3), anchor }),
  hero: z.object({ eyebrow, heading, intro, primary: link.optional(), secondary: link.optional(), more: link.optional(), note: z.string().default(""), artwork: z.boolean().default(true) }),
  text: z.object({ eyebrow, heading, intro, paragraphs: z.array(z.string()).default([]) }),
  services: z.object({ eyebrow, heading, intro, items: z.array(z.object({ title: heading, text: z.string(), label: z.string().optional() })).default([]) }),
  projectsShowcase: z.object({ eyebrow, heading, intro, items: z.array(z.object({ title: heading, category: z.string(), description: z.string(), href: safeHref.optional(), tone: z.enum(["lavender", "sage", "sand"]).default("lavender") })).default([]) }),
  stats: z.object({ items: z.array(z.object({ value: heading, label: heading })).default([]) }),
  shortcuts: z.object({ eyebrow, heading, intro, links: z.array(link).default([]) }),
  cta: z.object({ eyebrow, heading, intro, link: link.optional() }),
};
export type CustomBaseBlockType = keyof typeof customBaseBlockSchemas;

export const customBaseBlockDefinitions: BlockDefinition[] = [
  defineBlock({ type: "imageText", label: "Image and text", category: "content", version: 2, fields: [...fields, { name: "paragraphs", label: "Paragraphs", type: "array" }, { name: "image", label: "Image", type: "object", fields: [{ name: "src", label: "Source", type: "text" }, { name: "alt", label: "Alternative text", type: "text" }, { name: "caption", label: "Caption", type: "text" }, { name: "width", label: "Width", type: "number" }, { name: "height", label: "Height", type: "number" }] }, { name: "side", label: "Image side", type: "select", options: ["left", "right"] }, { name: "anchor", label: "Anchor", type: "text" }], required: ["heading"], defaults: { eyebrow: "Vår process", heading: "Form med omtanke.", intro: "Från första idé till färdig upplevelse.", paragraphs: [], side: "left" } }),
  defineBlock({ type: "faq", label: "Frequently asked questions", category: "content", version: 2, fields: [...fields, { name: "items", label: "Questions", type: "array", fields: [{ name: "question", label: "Question", type: "text" }, { name: "answer", label: "Answer", type: "textarea" }] }, { name: "openFirst", label: "Open first answer", type: "boolean" }, { name: "anchor", label: "Anchor", type: "text" }], required: ["heading"], defaults: { heading: "Vanliga frågor", intro: "", eyebrow: "Bra att veta", items: [{ question: "Kan vi anpassa uttrycket?", answer: "Ja. Varje projekt väljer sitt innehåll och sin visuella riktning." }], openFirst: false } }),
  defineBlock({ type: "gallery", label: "Image gallery", category: "portfolio", version: 2, fields: [...fields, { name: "items", label: "Images", type: "array", fields: [{ name: "src", label: "Source", type: "text" }, { name: "alt", label: "Alternative text", type: "text" }, { name: "caption", label: "Caption", type: "text" }, { name: "width", label: "Width", type: "number" }, { name: "height", label: "Height", type: "number" }] }, { name: "columns", label: "Columns", type: "select", options: [2, 3, 4] }, { name: "anchor", label: "Anchor", type: "text" }], required: ["heading"], defaults: { heading: "Ett urval", intro: "", eyebrow: "Galleri", items: [], columns: 3 } }),
  defineBlock({ type: "hero", label: "Editorial hero", description: "Large type, two actions and optional geometric artwork.", icon: "layout", category: "intro", version: 2,
    fields: [...fields, { name: "primary", label: "Primary action", type: "link" }, { name: "secondary", label: "Secondary action", type: "link" }, { name: "more", label: "Discover link", type: "link" }, { name: "note", label: "Small note", type: "text" }, { name: "artwork", label: "Geometric artwork", type: "boolean" }],
    required: ["heading"], defaults: { eyebrow: "Independent by design", heading: "En egen idé.\nEn egen riktning.", intro: "En genomtänkt digital plats, formad efter det du vill skapa.", primary: { label: "Utforska", href: "#work" }, secondary: { label: "Ta kontakt", href: "#contact" }, note: "Skapad med omsorg. Byggd för att växa.", artwork: true },
    presets: [{ id: "type-only", label: "Typography only", props: { artwork: false } }], capabilities: { background: true } }),
  defineBlock({ type: "text", label: "Editorial text", description: "Two-column introduction with readable body text.", icon: "text", category: "content", version: 2,
    fields: [...fields, { name: "paragraphs", label: "Paragraphs", type: "array" }], required: ["heading"], defaults: { eyebrow: "01 / Vår riktning", heading: "Det börjar med\nen bra idé.", intro: "Tydlig form. Ett eget uttryck.", paragraphs: ["Vi tror på digitala upplevelser som känns självklara att använda och personliga att möta."] } }),
  defineBlock({ type: "services", label: "Feature rows", description: "Numbered rows for services, features or principles.", icon: "list", category: "content", version: 2,
    fields: [...fields, { name: "items", label: "Items", type: "array", itemLabel: "{title}", fields: [{ name: "title", label: "Title", type: "text" }, { name: "text", label: "Description", type: "textarea" }, { name: "label", label: "Label", type: "text" }] }],
    required: ["heading"], defaults: { eyebrow: "02 / Möjligheter", heading: "En bas.\nFlera möjligheter.", intro: "Välj det som passar, och bygg vidare därifrån.", items: [{ title: "Ett eget uttryck", text: "Färger, typografi och detaljer som känns som du.", label: "Design" }, { title: "Plats för innehåll", text: "Sidor, artiklar och projekt i en sammanhängande upplevelse.", label: "Content" }, { title: "Redo för nästa steg", text: "Funktioner som kan växa tillsammans med projektet.", label: "Build" }] } }),
  defineBlock({ type: "projectsShowcase", label: "Project gallery", description: "An editorial gallery with abstract covers and optional links.", icon: "grid", category: "portfolio", version: 2,
    fields: [...fields, { name: "items", label: "Projects", type: "array", itemLabel: "{title}", fields: [{ name: "title", label: "Title", type: "text" }, { name: "category", label: "Category", type: "text" }, { name: "description", label: "Description", type: "textarea" }, { name: "href", label: "URL", type: "text" }, { name: "tone", label: "Cover tone", type: "select", options: ["lavender", "sage", "sand"] }] }],
    required: ["heading"], defaults: { eyebrow: "03 / Utvalda riktningar", heading: "Olika idéer.\nSamma omtanke.", intro: "Tre visuella exempel på hur en gemensam grund kan få ett eget uttryck.", items: [{ title: "Studio North", category: "Identitet / Digitalt", description: "Ett lugnt och självsäkert uttryck.", tone: "lavender" }, { title: "Forma", category: "Koncept / Plattform", description: "Mjuka former med en tydlig struktur.", tone: "sage" }, { title: "Edition 01", category: "Innehåll / Redaktionellt", description: "En plats där berättelsen står i centrum.", tone: "sand" }] } }),
  defineBlock({ type: "stats", label: "Number strip", icon: "chart", category: "content", version: 2,
    fields: [{ name: "items", label: "Numbers", type: "array", fields: [{ name: "value", label: "Value", type: "text" }, { name: "label", label: "Label", type: "text" }] }],
    defaults: { items: [{ value: "01", label: "Gemensam grund" }, { value: "03", label: "Visuella riktningar" }, { value: "∞", label: "Möjligheter att bygga vidare" }] } }),
  defineBlock({ type: "shortcuts", label: "Quick links", description: "A compact set of useful navigation links.", icon: "arrow", category: "navigation", version: 2,
    fields: [...fields, { name: "links", label: "Links", type: "array", itemLabel: "{label}", fields: [{ name: "label", label: "Label", type: "text" }, { name: "href", label: "URL", type: "text" }] }],
    required: ["heading"], defaults: { eyebrow: "Hitta rätt", heading: "Vad vill du utforska?", intro: "", links: [{ label: "Våra möjligheter", href: "#services" }, { label: "Utvalda riktningar", href: "#work" }, { label: "Starta ett samtal", href: "#contact" }] } }),
  defineBlock({ type: "cta", label: "Closing invitation", description: "A strong closing section with a contact action.", icon: "message", category: "contact", version: 2,
    fields: [...fields, { name: "link", label: "Action", type: "link" }], required: ["heading"], defaults: { eyebrow: "Nästa kapitel", heading: "Vad vill\ndu skapa?", intro: "Berätta om din idé. Vi börjar med ett samtal.", link: { label: "Säg hej", href: "mailto:hello@example.com" } } }),
];

/** Block type shortcuts, like the SaaS block picker; these are not routes. */
export const customBaseShortcuts: Record<string, CustomBaseBlockType> = {
  photos: "gallery", questions: "faq", split: "imageText", intro: "hero", story: "text", features: "services", work: "projectsShowcase", numbers: "stats", links: "shortcuts", contact: "cta",
};
export const customBaseBlockTemplates = customBaseBlockDefinitions.map(blockDefinitionToLegacyTemplate);

export function createCustomBaseBlock(typeOrShortcut: string, id: string, props: Record<string, unknown> = {}, presetId?: string) {
  if (!id.trim()) throw new Error("Block id is required.");
  const type = customBaseShortcuts[typeOrShortcut] ?? typeOrShortcut;
  const definition = customBaseBlockDefinitions.find(block => block.type === type);
  if (!definition) throw new Error(`Unknown Custom block "${type}".`);
  const preset = presetId ? definition.presets?.find(item => item.id === presetId) : undefined;
  if (presetId && !preset) throw new Error(`Unknown block preset "${presetId}".`);
  const schema = customBaseBlockSchemas[type as CustomBaseBlockType];
  return { id, type, props: schema.parse({ ...structuredClone(definition.defaults), ...structuredClone(preset?.props ?? {}), ...props }) };
}
