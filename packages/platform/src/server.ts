// Server-side product entry point for a Staark client deployment.
// Low-level Hub/content primitives come from core; Next.js product behavior
// lives in this package so client deployments depend on one platform boundary.
export {
  createStaarkContent,
  createStorage,
  verifySignature,
  checkForPlatformUpdate,
  UPDATE_HUB_PATHS,
  getStorage,
  setStorage,
  readStorageJson,
  writeStorageJson,
  normalizeStoragePath,
  StorageError,
  type StaarkContent,
  type StaarkStorage,
  type UpdateArtifact,
  type UpdateManifest,
  type UpdateCheckRequest,
  type UpdateCheckResponse,
  type StorageEntry,
  type S3StorageOptions,
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

export {
  resolveDeploymentIdentity,
  type ResolveDeploymentIdentityOptions,
} from "./deployment/identity";
