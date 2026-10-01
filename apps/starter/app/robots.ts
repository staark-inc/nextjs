import type { MetadataRoute } from "next";
import { buildRobots } from "@staark/platform/server";
import { content } from "@/lib/staark";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobots(await content.getSite());
}
