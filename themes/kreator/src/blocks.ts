import {
  defineBlock,
  type BlockDefinition,
  type BlockField,
} from "@staark/theme-kit/block";

const EYEBROW: BlockField = { name: "eyebrow", label: "Eyebrow", type: "text", help: "Small label above the heading." };
const HEADING: BlockField = { name: "heading", label: "Heading", type: "text" };
const INTRO: BlockField = { name: "intro", label: "Intro", type: "textarea" };
const PLATFORM_OPTIONS = [
  { label: "Auto (from link)", value: "" },
  ...["youtube", "kick", "twitch", "instagram", "tiktok", "x", "discord", "teamspeak", "facebook", "email", "shop", "link"].map((p) => ({ label: p, value: p })),
];
const PLATFORM_LINK: BlockField[] = [
  { name: "href", label: "Link", type: "text", placeholder: "https://…" },
  { name: "label", label: "Label (optional)", type: "text", help: "Defaults to the platform name." },
  { name: "platform", label: "Platform", type: "select", options: PLATFORM_OPTIONS },
  { name: "note", label: "Note", type: "text", placeholder: "Live acum" },
];
const COPY: BlockField[] = [
  { name: "copyLabel", label: "Copy button label", type: "text", placeholder: "Copiază" },
  { name: "copiedLabel", label: "Copied label", type: "text", placeholder: "Copiat!" },
];

export const kreatorBlockDefinitions = [
  defineBlock({
    type: "partnerCodes",
    label: "Partner codes",
    description: "Sponsors and affiliate offers with copyable codes and a disclosure line.",
    icon: "receipt",
    category: "commerce",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "partners",
        label: "Partners",
        type: "array",
        itemLabel: "{name}",
        fields: [
          { name: "name", label: "Name", type: "text" },
          { name: "offer", label: "Offer", type: "text", placeholder: "−10 % la tot" },
          { name: "description", label: "Description", type: "text" },
          { name: "code", label: "Code", type: "text", placeholder: "NOVA10" },
          { name: "href", label: "Link", type: "text" },
          { name: "category", label: "Category (filter)", type: "text", placeholder: "Periferice" },
          { name: "logo", label: "Logo", type: "image" },
          { name: "featured", label: "Featured (wide card)", type: "boolean" },
          {
            name: "cardStyle",
            label: "Card style",
            type: "select",
            options: [
              { label: "Standard", value: "standard" },
              { label: "Artwork — campaign image + action bar below", value: "artwork" },
              { label: "Cover — text/actions over background image", value: "cover" },
            ],
          },
          { name: "background", label: "Promo background", type: "image", help: "Used by Artwork and Cover card styles. Choose campaign artwork from Media." },
          {
            name: "backgroundPosition",
            label: "Background position",
            type: "select",
            options: [
              { label: "Center", value: "center" },
              { label: "Top", value: "top" },
              { label: "Bottom", value: "bottom" },
            ],
          },
          {
            name: "imageFit",
            label: "Image fit",
            type: "select",
            options: [
              { label: "Natural — preserve the artwork's own ratio", value: "natural" },
              { label: "Cover — crop to a fixed 16:9 area", value: "cover" },
              { label: "Contain — fit inside a fixed 16:9 area", value: "contain" },
            ],
            help: "Use Natural for finished campaign creatives with their own logo/text. Cover is best for photos.",
          },
          {
            name: "overlay",
            label: "Image overlay",
            type: "select",
            options: [
              { label: "None", value: "none" },
              { label: "Soft", value: "soft" },
              { label: "Dark", value: "dark" },
            ],
          },
          {
            name: "promoContent",
            label: "Promo content",
            type: "select",
            options: [
              { label: "Actions only — artwork contains promo text", value: "actions" },
              { label: "Full content — show partner text over image", value: "full" },
            ],
          },
        ],
      },
      { name: "disclosure", label: "Advertising disclosure", type: "textarea", help: "Keep a clear disclosure for affiliate links." },
      { name: "allLabel", label: "'All' filter label", type: "text", placeholder: "Toate" },
      { name: "linkLabel", label: "Link label", type: "text", placeholder: "Mergi la ofertă" },
      ...COPY,
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Coduri",
      heading: "Codurile mele",
      partners: [{ name: "Partener", offer: "−10 %", code: "COD10", href: "https://example.com", category: "Shop" }],
    },
  }),
  defineBlock({
    type: "streamSchedule",
    label: "Stream schedule",
    description: "The week at a glance with today highlighted.",
    icon: "calendar",
    category: "content",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "days",
        label: "Days (Monday first)",
        type: "array",
        itemLabel: "{day}",
        fields: [
          { name: "day", label: "Day", type: "text", placeholder: "Luni" },
          { name: "time", label: "Time", type: "text", placeholder: "20:00–23:00" },
          { name: "title", label: "What", type: "text", placeholder: "CS2 ranked" },
          { name: "platform", label: "Where", type: "text", placeholder: "Kick" },
          { name: "off", label: "Day off", type: "boolean" },
        ],
      },
      { name: "timeZone", label: "Time zone (IANA)", type: "text", placeholder: "Europe/Bucharest" },
      { name: "timeZoneLabel", label: "Time zone note", type: "text", placeholder: "Ora României" },
      { name: "todayLabel", label: "'Today' label", type: "text", placeholder: "azi" },
      { name: "offLabel", label: "Day-off label", type: "text", placeholder: "Pauză" },
      { name: "note", label: "Note", type: "text" },
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Program",
      heading: "Când sunt live",
      timeZone: "Europe/Bucharest",
      days: ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"].map((day) => ({ day, time: "20:00–23:00", title: "Stream" })),
    },
  }),
  defineBlock({
    type: "gearSetup",
    label: "Gear setup",
    description: "PC, peripherals and game settings, with a copyable config.",
    icon: "grid",
    category: "content",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      { name: "image", label: "Setup photo", type: "image" },
      {
        name: "groups",
        label: "Groups",
        type: "array",
        itemLabel: "{title}",
        fields: [
          { name: "title", label: "Group", type: "text", placeholder: "Periferice" },
          {
            name: "items",
            label: "Items",
            type: "array",
            itemLabel: "{label}",
            fields: [
              { name: "label", label: "Type", type: "text", placeholder: "Mouse" },
              { name: "name", label: "Model", type: "text" },
              { name: "spec", label: "Spec", type: "text" },
              { name: "href", label: "Link (optional)", type: "text" },
            ],
          },
        ],
      },
      { name: "settingsTitle", label: "Settings title", type: "text", placeholder: "Setări CS2" },
      {
        name: "settings",
        label: "Settings",
        type: "array",
        itemLabel: "{label}",
        fields: [
          { name: "label", label: "Setting", type: "text", placeholder: "DPI" },
          { name: "value", label: "Value", type: "text", placeholder: "800" },
        ],
      },
      {
        name: "configCode",
        label: "Copyable config",
        type: "object",
        fields: [
          { name: "label", label: "Label", type: "text", placeholder: "Crosshair" },
          { name: "code", label: "Code", type: "text" },
        ],
      },
      { name: "linkNote", label: "Affiliate note", type: "text" },
      ...COPY,
    ],
    required: ["heading"],
    defaults: {
      eyebrow: "Setup",
      heading: "Configul meu",
      groups: [{ title: "Periferice", items: [{ label: "Mouse", name: "Model" }] }],
    },
  }),
  defineBlock({
    type: "videoGrid",
    label: "Video grid",
    description: "Latest videos as link cards with thumbnails.",
    icon: "image",
    category: "media",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "videos",
        label: "Videos",
        type: "array",
        itemLabel: "{title}",
        fields: [
          { name: "title", label: "Title", type: "text" },
          { name: "href", label: "Link", type: "text" },
          { name: "thumbnail", label: "Thumbnail", type: "imageUrl" },
          { name: "duration", label: "Duration", type: "text", placeholder: "12:34" },
          { name: "meta", label: "Meta", type: "text", placeholder: "84k vizualizări · acum 3 zile" },
          { name: "platform", label: "Platform", type: "select", options: PLATFORM_OPTIONS },
        ],
      },
      { name: "cta", label: "Button", type: "link" },
    ],
    required: ["heading"],
    defaults: { eyebrow: "Video", heading: "Ultimele videoclipuri", videos: [] },
  }),
  defineBlock({
    type: "socialLinks",
    label: "Social links",
    description: "Every channel as a tile with handle and follower count.",
    icon: "link",
    category: "social",
    version: 2,
    fields: [
      EYEBROW,
      HEADING,
      INTRO,
      {
        name: "links",
        label: "Channels",
        type: "array",
        itemLabel: "{href}",
        fields: [
          ...PLATFORM_LINK,
          { name: "handle", label: "Handle", type: "text", placeholder: "@nova" },
          { name: "count", label: "Followers", type: "text", placeholder: "184k" },
          { name: "countLabel", label: "Followers label", type: "text", placeholder: "abonați" },
        ],
      },
    ],
    required: ["heading"],
    defaults: { eyebrow: "Social", heading: "Mă găsești aici", links: [{ href: "https://www.youtube.com/" }] },
  }),
] satisfies readonly BlockDefinition[];
