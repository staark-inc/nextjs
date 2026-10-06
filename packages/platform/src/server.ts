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
  resolveAdminSessionSecret,
  StaarkConfigurationError,
  type AdminAuthConfig,
} from "./admin/auth-config";

export {
  ADMIN_ROLES,
  resolveAdminAccounts,
  resolveAdminLoginAccount,
  resolveAdminRole,
  type AdminRole,
  type AdminAccount,
} from "./admin/roles";

export {
  ADMIN_SESSION_TTL_SECONDS,
  ADMIN_REMEMBER_TTL_SECONDS,
  ADMIN_LOGIN_PATH,
  ADMIN_HOME_PATH,
  isAdminSessionActive,
  adminSessionExpiresAt,
  safeAdminNext,
  secureEqual,
  adminCredentialsMatch,
  clientAddress,
  createLoginRateLimiter,
  type AdminSessionLike,
  type LoginGate,
  type LoginRateLimiter,
  type LoginRateLimitOptions,
} from "./admin/login-guard";

export {
  resolveDeploymentIdentity,
  type ResolveDeploymentIdentityOptions,
} from "./deployment/identity";

export {
  MailConfigurationError,
  resolveMailConfig,
  summarizeMailConfig,
  getMailTransport,
  verifyMailTransport,
  sendMail,
  type MailConfig,
  type MailConfigSummary,
  type DisabledMailConfig,
  type SmtpMailConfig,
  type StaarkMailMessage,
  type StaarkMailResult,
} from "./mail/index.ts";

export {
  renderEmailTemplate,
  renderSubmissionNotification,
  sendSubmissionNotification,
  type EmailTemplateInput,
  type EmailTemplateRow,
  type EmailTemplateAction,
  type RenderedEmailTemplate,
  type SubmissionNotificationInput,
} from "./mail/index.ts";
