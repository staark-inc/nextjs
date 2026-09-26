// Server-side product entry point for a Staark client deployment.
// Low-level Hub/content primitives come from core; Next.js product behavior
// lives in this package so client deployments depend on one platform boundary.
export {
  createStaarkContent,
  type StaarkContent,
} from "@staark/core/server";

export { createFormsRoute, type FormsRouteOptions } from "./next/forms";
export { createRevalidateRoute } from "./next/revalidate";
export {
  buildMetadata,
  buildRootMetadata,
  buildSitemap,
  buildRobots,
  localBusinessJsonLd,
  jsonLdString,
} from "./next/seo";

export {
  resolveAdminAuthConfig,
  StaarkConfigurationError,
  type AdminAuthConfig,
} from "./admin/auth-config";
