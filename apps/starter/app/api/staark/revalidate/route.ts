import { createRevalidateRoute } from "@staark/core/server";
import { content } from "@/lib/staark";

// Signed webhook from Staark Hub: purges cache tags/paths when content changes.
export const dynamic = "force-dynamic";
export const { GET, POST } = createRevalidateRoute(content);
