import { z } from "zod";
import { DeploymentIdentitySchema, DeploymentUpdateChannelSchema } from "../deployment.ts";

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;
const SHA256_RE = /^sha256:[a-f0-9]{64}$/;

export const UpdateArtifactSchema = z.object({
  kind: z.literal("docker-image"),
  reference: z.string().trim().min(1).max(500),
  digest: z.string().regex(SHA256_RE).optional(),
});
export type UpdateArtifact = z.infer<typeof UpdateArtifactSchema>;

export const UpdateManifestSchema = z.object({
  schema: z.literal("staark-update/v1"),
  updateId: z.string().trim().min(1).max(128),
  version: z.string().regex(VERSION_RE),
  channel: DeploymentUpdateChannelSchema,
  publishedAt: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(20_000).optional(),
  artifact: UpdateArtifactSchema,
  requiresBackup: z.boolean().default(true),
  minPlatformVersion: z.string().regex(VERSION_RE).optional(),
});
export type UpdateManifest = z.infer<typeof UpdateManifestSchema>;

export const UpdateCheckRequestSchema = z.object({
  schema: z.literal("staark-update-check-request/v1"),
  deployment: DeploymentIdentitySchema,
});
export type UpdateCheckRequest = z.infer<typeof UpdateCheckRequestSchema>;

const updateCheckBase = {
  schema: z.literal("staark-update-check/v1"),
  checkedAt: z.string().trim().min(1),
};

export const UpdateCheckResponseSchema = z.discriminatedUnion("status", [
  z.object({
    ...updateCheckBase,
    status: z.literal("current"),
  }),
  z.object({
    ...updateCheckBase,
    status: z.literal("available"),
    update: UpdateManifestSchema,
  }),
  z.object({
    ...updateCheckBase,
    status: z.literal("blocked"),
    reason: z.string().trim().min(1).max(500),
  }),
]);
export type UpdateCheckResponse = z.infer<typeof UpdateCheckResponseSchema>;
