import {
  defineBlock,
  type BlockDefinition,
  type BlockField,
} from "@staark/theme-kit/block";

const EYEBROW: BlockField = {
  name: "eyebrow",
  label: "Eyebrow",
  type: "text",
  help: "Small label above the heading.",
};

/**
 * Blocks v2 source of truth for Salong-owned blocks.
 * The price-list schema matches the renderer and fixtures: groups -> title/items.
 */
export const salongBlockDefinitions = [
  defineBlock({
    type: "priceList",
    label: "Price list",
    description: "Services and prices grouped by category.",
    icon: "receipt",
    category: "services",
    version: 2,
    fields: [
      EYEBROW,
      { name: "heading", label: "Heading", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
      {
        name: "groups",
        label: "Categories",
        type: "array",
        itemLabel: "{title}",
        fields: [
          { name: "title", label: "Category name", type: "text" },
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
    required: ["heading"],
    defaults: {
      eyebrow: "Priser",
      heading: "Våra priser",
      groups: [
        {
          title: "Klippning",
          items: [
            { name: "Damklippning", duration: "45 min", price: "595 kr" },
            { name: "Herrklippning", duration: "30 min", price: "495 kr" },
          ],
        },
      ],
    },
  }),
  defineBlock({
    type: "gallery",
    label: "Gallery",
    description: "Show salon work and inspiration.",
    icon: "image",
    category: "media",
    version: 2,
    fields: [
      EYEBROW,
      { name: "heading", label: "Heading", type: "text" },
      {
        name: "images",
        label: "Images",
        type: "array",
        itemLabel: "{alt}",
        fields: [
          { name: "src", label: "Image URL", type: "imageUrl" },
          { name: "alt", label: "Alt text", type: "text" },
        ],
      },
    ],
    required: [],
    defaults: {
      eyebrow: "Galleri",
      heading: "Våra senaste jobb",
      images: [],
    },
  }),
] satisfies readonly BlockDefinition[];
