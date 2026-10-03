import {
  defineBlock,
  type BlockDefinition,
  type BlockField,
} from "@staark/theme-kit/block";

import {
  verkstadBlockFields,
  verkstadBlockTemplates,
  verkstadRequiredFields,
} from "./admin";

const CATEGORY: Record<string, string> = {
  promises: "trust",
  priceTable: "services",
  highlightBand: "marketing",
  serviceBooking: "forms",
  faq: "content",
};

/**
 * Blocks v2 integration for S-Hub Verkstad.
 *
 * The legacy package already contains complete field metadata and picker
 * defaults. During the port to the current main contract we adapt that metadata
 * into BlockDefinition instead of duplicating it.
 */
export const verkstadBlockDefinitions =
  verkstadBlockTemplates.map((template) =>
    defineBlock({
      type: template.type,
      label: template.label,
      description: template.description,
      icon: template.icon,
      category: CATEGORY[template.type] ?? "content",
      version: 2,
      fields:
        (verkstadBlockFields[template.type] ??
          []) as readonly BlockField[],
      required:
        verkstadRequiredFields[template.type] ??
        [],
      defaults: template.template,
    }),
  ) satisfies readonly BlockDefinition[];
