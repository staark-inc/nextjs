import { createFormsRoute } from "@staark/platform/server";
import { content } from "@/lib/staark";

// GET ?form=<id> issues a time-trap token; POST forwards a typed submission to Staark Hub.
export const dynamic = "force-dynamic";
export const { GET, POST } = createFormsRoute(content);
