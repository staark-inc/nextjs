import type { MetadataRoute } from "next";
import { buildRobots } from "@staark/core/server";
import { content } from "@/lib/staark";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobots(await content.getSite());
}
