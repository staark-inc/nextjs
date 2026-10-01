/**
 * Admin integration for S-Hub Skönhet.
 *
 * Theme-owned block metadata is declared once through Blocks v2 in blocks.ts.
 * This module keeps page templates and the Skönhet extension fields for the
 * inherited Light hero.
 */

import type {
  BlockField,
  LegacyBlockTemplate,
} from "@staark/theme-kit";

export {
  skonhetBlockDefinitions,
  skonhetBlockFields,
  skonhetBlockTemplates,
  skonhetRequiredFields,
} from "./blocks";

export type AdminField = BlockField;
export type AdminBlockTemplate = LegacyBlockTemplate;

export type AdminPageTemplate = {
  id: string;
  label: string;
  description: string;
  blocks: (title: string) => {
    id: string;
    type: string;
    props: Record<string, unknown>;
  }[];
};

/**
 * Extra hero fields, only rendered by the Skönhet hero.
 * Hero itself is inherited from Light, so this remains an extension until the
 * Blocks v2 parent/child block-extension contract is introduced.
 */
export const skonhetHeroFields: AdminField[] = [
  {
    name: "headingAccent",
    label: "Heading accent (italic, Skönhet)",
    type: "text",
  },
  {
    name: "detailImage",
    label: "Detail image (Skönhet)",
    type: "image",
  },
  {
    name: "badge",
    label: "Badge (Skönhet)",
    type: "text",
    placeholder: "−15 % första besöket",
  },
  {
    name: "showVisit",
    label: "Show address & hours (Skönhet)",
    type: "boolean",
  },
];

const block = (
  id: string,
  type: string,
  props: Record<string, unknown>,
) => ({ id, type, props });

/** Page templates offered when creating a page with this theme active. */
export const skonhetPageTemplates: AdminPageTemplate[] = [
  {
    id: "skonhet-menu",
    label: "Menu & prices page",
    description: "Hero, service menu and booking form.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Alla behandlingar och priser.",
      }),
      block("meny", "serviceMenu", {
        heading: "Meny & priser",
        categories: [],
      }),
      block("boka", "bookingRequest", {
        heading: "Boka din tid",
        formId: "skonhet-bokning",
        services: [],
      }),
    ],
  },
  {
    id: "skonhet-team",
    label: "Team page",
    description: "Hero, stylists and lookbook.",
    blocks: (title) => [
      block("hero", "hero", {
        heading: title,
        intro: "Människorna bakom stolarna.",
      }),
      block("team", "stylists", {
        heading: "Våra stylister",
        people: [],
      }),
      block("look", "lookbook", {
        heading: "Senaste jobben",
        items: [],
      }),
    ],
  },
];
