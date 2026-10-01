import { createHash } from "node:crypto";

import type { Page } from "@staark/core";

export function checksumPage(page: Page): string {
  return createHash("sha256").update(JSON.stringify(page)).digest("hex");
}
