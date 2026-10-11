import type {
  CustomSectionOverrides,
} from "@staark/custom";

import {
  CustomHero,
} from "./components/CustomHero";

export const customSectionOverrides = {
  hero:
    CustomHero,
} satisfies CustomSectionOverrides;
