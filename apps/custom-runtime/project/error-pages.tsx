import type { CustomErrorRegistry } from "@/lib/custom-errors";
import { CustomNotFound, CustomError } from "./error-views";

// Trusted bundled components, selected by exact project key. No imports from JSON.
export const customProjectErrorPages = {
  "custom-demo": { notFound: CustomNotFound, error: CustomError },
} satisfies CustomErrorRegistry;
