import { createStaarkContent } from "@staark/platform/server";

/** One content client per server process, reused across requests. */
export const content = createStaarkContent();
