import { createFormsRoute } from "@staark/platform/server";
import { content } from "@/lib/staark";

// GET ?form=<id> issues a time-trap token; POST submits to S-Hub Inbox via the Hub.
export const dynamic = "force-dynamic";
export const { GET, POST } = createFormsRoute(content);
