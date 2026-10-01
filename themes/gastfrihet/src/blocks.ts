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

/** Blocks v2 source of truth for Gästfrihet-owned blocks. */
export const gastfrihetBlockDefinitions = [
  defineBlock({
    type: "rooms",
    label: "Rooms",
    description: "Room cards with price, capacity and amenities.",
    icon: "bed",
    category: "hospitality",
    version: 2,
    fields: [
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
          {
            name: "amenities",
            label: "Amenities",
            type: "array",
            itemLabel: "{value}",
            fields: [{ name: "value", label: "Amenity", type: "text" }],
          },
          { name: "href", label: "Link", type: "text" },
        ],
      },
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Rum",
      heading: "Våra rum",
      rooms: [
        {
          name: "Standardrum",
          occupancy: "2 gäster",
          description: "Ett bekvämt rum för två.",
          price: "990 kr / natt",
          amenities: ["Dubbelsäng", "Privat badrum", "WiFi"],
          href: "/kontakt",
        },
      ],
    },
  }),
  defineBlock({
    type: "amenities",
    label: "Amenities",
    description: "Facilities and included amenities.",
    icon: "sparkles",
    category: "hospitality",
    version: 2,
    fields: [
      EYEBROW,
      { name: "heading", label: "Heading", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
      {
        name: "items",
        label: "Amenities",
        type: "array",
        itemLabel: "{label}",
        fields: [
          { name: "label", label: "Label", type: "text" },
          { name: "icon", label: "Icon", type: "text" },
        ],
      },
    ],
    required: ["heading"],
    defaults: {
      heading: "Bekvämligheter",
      intro: "Allt du behöver för en bekväm vistelse.",
      items: [
        { label: "Frukost ingår", icon: "🍳" },
        { label: "Gratis WiFi", icon: "📶" },
      ],
    },
  }),
] satisfies readonly BlockDefinition[];
