import type { CustomErrorRegistry } from "@/lib/custom-errors";
import { CustomNotFound, CustomError, FormaNotFound, FormaError } from "./error-views";

// Trusted bundled components, selected by exact project key. No imports from JSON.
export const customProjectErrorPages = {
  "forma-demo": { notFound: FormaNotFound, error: FormaError },
  "custom-demo": { notFound: CustomNotFound, error: CustomError },
} satisfies CustomErrorRegistry;
