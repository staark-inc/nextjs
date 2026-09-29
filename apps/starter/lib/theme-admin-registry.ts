import {
  skonhetBlockTemplates,
  skonhetPageTemplates,
} from "@staark/theme-skonhet/admin";


import {
  elBlockTemplates,
  elPageTemplates,
} from "@staark/theme-el/admin";


import {
  kreatorBlockTemplates,
  kreatorPageTemplates,
} from "@staark/theme-kreator/admin";
export type ThemeBlockTemplate = {
  type: string;
  label: string;
  description: string;
  icon: string;
  template: Record<string, unknown>;
};

export type ThemePageBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type ThemePageTemplate = {
  id: string;
  label: string;
  description: string;
  blocks: (title: string) => ThemePageBlock[];
};

function block(
  id: string,
  type: string,
  props: Record<string, unknown>,
): ThemePageBlock {
  return {
    id,
    type,
    props,
  };
}


/* ==========================================================
 * SALONG
 * ======================================================== */

const SALONG_BLOCKS: ThemeBlockTemplate[] = [
  {
    type: "priceList",
    label: "Price list",
    description:
      "Services and prices grouped by category.",
    icon: "receipt",
    template: {
      eyebrow: "Priser",
      heading: "Våra priser",
      categories: [
        {
          name: "Klippning",
          items: [
            {
              name: "Damklippning",
              duration: "45 min",
              price: "595 kr",
            },
            {
              name: "Herrklippning",
              duration: "30 min",
              price: "495 kr",
            },
          ],
        },
      ],
    },
  },
  {
    type: "gallery",
    label: "Gallery",
    description:
      "Show salon work and inspiration.",
    icon: "image",
    template: {
      eyebrow: "Galleri",
      heading: "Våra senaste jobb",
      images: [],
    },
  },
];

const SALONG_PAGES: ThemePageTemplate[] = [
  {
    id: "salong-prices",
    label: "Price page",
    description:
      "Hero, salon price list and booking call to action.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Utforska våra behandlingar och priser.",
      }),
      block("prices", "priceList", {
        heading: "Priser",
        categories: [],
      }),
      block("cta", "cta", {
        heading: "Redo att boka?",
        cta: {
          label: "Boka tid",
          href: "/kontakt",
        },
      }),
    ],
  },
  {
    id: "salong-gallery",
    label: "Gallery page",
    description:
      "Hero, salon gallery and booking call to action.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Ett urval av våra senaste jobb.",
      }),
      block("gallery", "gallery", {
        heading: "Galleri",
        images: [],
      }),
      block("cta", "cta", {
        heading: "Gillar du det du ser?",
        cta: {
          label: "Boka tid",
          href: "/kontakt",
        },
      }),
    ],
  },
];


/* ==========================================================
 * SKÖNHET
 *
 * Source of truth lives inside the theme package.
 * ======================================================== */

const SKONHET_BLOCKS =
  skonhetBlockTemplates as unknown as ThemeBlockTemplate[];

const SKONHET_PAGES =
  skonhetPageTemplates as unknown as ThemePageTemplate[];


/* ==========================================================
 * EL
 *
 * Source of truth lives inside the theme package.
 * ======================================================== */

const EL_BLOCKS =
  elBlockTemplates as unknown as ThemeBlockTemplate[];

const EL_PAGES =
  elPageTemplates as unknown as ThemePageTemplate[];


/* ==========================================================
 * KREATÖR
 *
 * Source of truth lives inside the theme package.
 * ======================================================== */

const KREATOR_BLOCKS =
  kreatorBlockTemplates as unknown as ThemeBlockTemplate[];

const KREATOR_PAGES =
  kreatorPageTemplates as unknown as ThemePageTemplate[];


/* ==========================================================
 * GÄSTFRIHET
 * ======================================================== */

const GASTFRIHET_BLOCKS: ThemeBlockTemplate[] = [
  {
    type: "rooms",
    label: "Rooms",
    description:
      "Room cards with price, capacity and amenities.",
    icon: "bed",
    template: {
      eyebrow: "Rum",
      heading: "Våra rum",
      rooms: [
        {
          name: "Standardrum",
          occupancy: "2 gäster",
          description:
            "Ett bekvämt rum för två.",
          price: "990 kr / natt",
          amenities: [
            "Dubbelsäng",
            "Privat badrum",
            "WiFi",
          ],
          href: "/kontakt",
        },
      ],
    },
  },
  {
    type: "amenities",
    label: "Amenities",
    description:
      "Facilities and included amenities.",
    icon: "sparkles",
    template: {
      heading: "Bekvämligheter",
      intro:
        "Allt du behöver för en bekväm vistelse.",
      items: [
        {
          label: "Frukost ingår",
          icon: "🍳",
        },
        {
          label: "Gratis WiFi",
          icon: "📶",
        },
      ],
    },
  },
];

const GASTFRIHET_PAGES: ThemePageTemplate[] = [
  {
    id: "gastfrihet-rooms",
    label: "Rooms page",
    description:
      "Hero, room cards, amenities and contact call to action.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Hitta boendet som passar dig.",
      }),
      block("rooms", "rooms", {
        heading: "Rum",
        rooms: [],
      }),
      block("amenities", "amenities", {
        heading: "Bekvämligheter",
        items: [],
      }),
      block("cta", "cta", {
        heading: "Planera din vistelse",
        cta: {
          label: "Kontakta oss",
          href: "/kontakt",
        },
      }),
    ],
  },
  {
    id: "gastfrihet-amenities",
    label: "Amenities page",
    description:
      "Hero, amenities and contact call to action.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Allt som ingår i din vistelse.",
      }),
      block("amenities", "amenities", {
        heading: "Bekvämligheter",
        items: [],
      }),
      block("cta", "cta", {
        heading: "Har du frågor?",
        cta: {
          label: "Kontakta oss",
          href: "/kontakt",
        },
      }),
    ],
  },
];


/* ==========================================================
 * BYRÅ
 * ======================================================== */

const BYRA_BLOCKS: ThemeBlockTemplate[] = [
  {
    type: "stats",
    label: "Stats",
    description:
      "Large business results and key figures.",
    icon: "bar-chart",
    template: {
      eyebrow: "Resultat",
      heading: "Siffror som talar",
      items: [
        {
          value: "120+",
          label: "Projekt levererade",
        },
        {
          value: "+38%",
          label: "Snitt i konvertering",
        },
      ],
    },
  },
  {
    type: "caseStudies",
    label: "Case studies",
    description:
      "Selected customer projects and results.",
    icon: "briefcase",
    template: {
      eyebrow: "Utvalt arbete",
      heading: "Nyligen ur studion",
      items: [
        {
          title: "Projektets titel",
          client: "Kundnamn",
          result:
            "Beskriv resultatet kort.",
          tags: [
            "Brand",
            "Webb",
          ],
        },
      ],
    },
  },
  {
    type: "team",
    label: "Team",
    description:
      "Agency team members and roles.",
    icon: "users",
    template: {
      eyebrow: "Teamet",
      heading: "Människorna bakom studion",
      people: [
        {
          name: "Förnamn Efternamn",
          role: "Designer",
        },
      ],
    },
  },
  {
    type: "logos",
    label: "Client logos",
    description:
      "Trusted brands and customer logos.",
    icon: "badge",
    template: {
      heading: "Betrodda av",
      logos: [],
    },
  },
];

const BYRA_PAGES: ThemePageTemplate[] = [
  {
    id: "byra-work",
    label: "Work / cases page",
    description:
      "Hero, case studies, results and CTA.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro:
          "Ett urval av projekt och samarbeten.",
      }),
      block("cases", "caseStudies", {
        eyebrow: "Utvalt arbete",
        heading: "Case studies",
        items: [],
      }),
      block("stats", "stats", {
        items: [],
      }),
      block("cta", "cta", {
        heading: "Har ni ett projekt på gång?",
        cta: {
          label: "Kontakta oss",
          href: "/kontakt",
        },
      }),
    ],
  },
  {
    id: "byra-team",
    label: "Team page",
    description:
      "Hero, team members and clients.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro:
          "Människorna bakom studion.",
      }),
      block("team", "team", {
        heading: "Teamet",
        people: [],
      }),
      block("logos", "logos", {
        heading: "Betrodda av",
        logos: [],
      }),
    ],
  },
];


/* ==========================================================
 * WEBB
 * ======================================================== */

const WEBB_BLOCKS: ThemeBlockTemplate[] = [
  {
    type: "featuredProject",
    label: "Featured project",
    description:
      "Highlight one customer project and its result.",
    icon: "briefcase",
    template: {
      eyebrow: "Utvalt projekt",
      client: "Kundnamn",
      title: "Projektets titel",
      description:
        "Beskriv projektet och vad ni levererade.",
      result: "+42% konvertering",
      tags: [
        "Webbdesign",
        "SEO",
      ],
      cta: {
        label: "Se projekt",
        href: "#",
      },
    },
  },
  {
    type: "pricing",
    label: "Pricing",
    description:
      "Productized packages with price and features.",
    icon: "receipt",
    template: {
      eyebrow: "Priser",
      heading: "Tydliga paket",
      intro:
        "Välj paketet som passar ditt företag.",
      plans: [
        {
          name: "Start",
          price: "2 999 kr",
          description:
            "För en enkel och professionell närvaro.",
          features: [
            "Mobilanpassad",
            "Kontaktformulär",
          ],
          cta: {
            label: "Välj Start",
            href: "/kontakt",
          },
        },
      ],
    },
  },
  {
    type: "serviceAreas",
    label: "Service areas",
    description:
      "Cities and geographical areas you serve.",
    icon: "map-pin",
    template: {
      eyebrow: "Var vi finns",
      heading: "Vi hjälper företag i hela regionen",
      areas: [
        "Värnamo",
        "Jönköping",
        "Vaggeryd",
      ],
    },
  },
];

const WEBB_PAGES: ThemePageTemplate[] = [
  {
    id: "webb-pricing",
    label: "Pricing page",
    description:
      "Hero, pricing packages and service areas.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro:
          "Tydliga paket och priser.",
      }),
      block("pricing", "pricing", {
        heading: "Priser",
        plans: [],
      }),
      block("areas", "serviceAreas", {
        heading: "Var vi finns",
        areas: [],
      }),
      block("cta", "cta", {
        heading: "Redo att komma igång?",
        cta: {
          label: "Kontakta oss",
          href: "/kontakt",
        },
      }),
    ],
  },
  {
    id: "webb-project",
    label: "Featured project page",
    description:
      "Hero and featured customer project.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
      }),
      block("project", "featuredProject", {
        title: "Projektets titel",
        client: "Kundnamn",
        description:
          "Berätta om projektet.",
      }),
      block("cta", "cta", {
        heading: "Vill du ha något liknande?",
        cta: {
          label: "Kontakta oss",
          href: "/kontakt",
        },
      }),
    ],
  },
];


/* ==========================================================
 * Registry
 * ======================================================== */

const BLOCKS: Record<string, ThemeBlockTemplate[]> = {
  salong: SALONG_BLOCKS,
  skonhet: SKONHET_BLOCKS,
  kreator: KREATOR_BLOCKS,
  
  el: EL_BLOCKS,gastfrihet: GASTFRIHET_BLOCKS,
  byra: BYRA_BLOCKS,
  webb: WEBB_BLOCKS,
};

const PAGES: Record<string, ThemePageTemplate[]> = {
  salong: SALONG_PAGES,
  skonhet: SKONHET_PAGES,
  kreator: KREATOR_PAGES,
  
  el: EL_PAGES,gastfrihet: GASTFRIHET_PAGES,
  byra: BYRA_PAGES,
  webb: WEBB_PAGES,
};

export function themeBlockTemplatesFor(
  theme: string,
): ThemeBlockTemplate[] {
  return BLOCKS[theme] ?? [];
}

export function themePageTemplatesFor(
  theme: string,
): ThemePageTemplate[] {
  return PAGES[theme] ?? [];
}

export function themePageBlocksFor(
  theme: string,
  templateId: string,
  title: string,
): ThemePageBlock[] {
  const template =
    themePageTemplatesFor(theme).find(
      (item) => item.id === templateId,
    );

  return template
    ? template.blocks(title)
    : [];
}
