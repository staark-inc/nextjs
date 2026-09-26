import { createStaarkContent } from "@staark/core/server";

/** One content client per server process, reused across requests. */
export const content = createStaarkContent();
