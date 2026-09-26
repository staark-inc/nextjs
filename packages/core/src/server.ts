import "server-only";

// Server entry: Hub connection, content client, route handlers and SEO/security helpers.
export * from "./schema";
export { createStaarkContent, HUB_PATHS, type StaarkContent } from "./hub/client";
export { readStaarkEnv, hubRequest, HubError, DEFAULT_HUB_URL, CLIENT_VERSION, type HubConnection } from "./hub/connection";
export { signRequest, verifySignature, issueFormToken, checkFormToken } from "./hub/sign";
export { createFormsRoute, type FormsRouteOptions } from "./next/forms";
export { createRevalidateRoute } from "./next/revalidate";
export { buildMetadata, buildRootMetadata, buildSitemap, buildRobots, localBusinessJsonLd, jsonLdString } from "./next/seo";
export { staarkSecurityHeaders } from "./next/security";
