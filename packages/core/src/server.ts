import "server-only";

// Server entry: Hub connection, content client, signing and shared contracts.
export * from "./schema";
export { createStaarkContent, HUB_PATHS, type StaarkContent } from "./hub/client";
export { readStaarkEnv, hubRequest, HubError, DEFAULT_HUB_URL, CLIENT_VERSION, type HubConnection } from "./hub/connection";
export { signRequest, verifySignature, issueFormToken, checkFormToken } from "./hub/sign";
export {
  createStorage,
  getStorage,
  setStorage,
  readJson as readStorageJson,
  writeJson as writeStorageJson,
  FsStorage,
  S3Storage,
  StorageError,
  normalizeStoragePath,
  type StaarkStorage,
  type StorageEntry,
  type S3StorageOptions,
} from "./storage";
