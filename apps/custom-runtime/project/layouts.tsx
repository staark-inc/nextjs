import type {
  CustomProjectLayouts,
} from "@/lib/custom-layouts";

import {
  CustomFooter,
} from "./layouts/CustomFooter";

import {
  CustomHeader,
} from "./layouts/CustomHeader";

import {
  CustomPageShell,
} from "./layouts/CustomPageShell";

export const customProjectLayouts = {
  header:
    CustomHeader,

  footer:
    CustomFooter,

  page:
    CustomPageShell,
} satisfies CustomProjectLayouts;
