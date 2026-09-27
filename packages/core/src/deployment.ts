import { z } from "zod";

export const STAARK_PLATFORM_VERSION = "0.1.0";

export const DeploymentUpdateChannelSchema = z.enum([
  "stable",
  "preview",
  "canary",
]);
export type DeploymentUpdateChannel = z.infer<
  typeof DeploymentUpdateChannelSchema
>;

export const DeploymentIdentitySchema = z.object({
  schema: z.literal("staark-deployment/v1"),
  deploymentId: z.string().trim().min(3).max(128),
  siteId: z.string().trim().min(1).max(128),
  platform: z.literal("staark-next"),
  platformVersion: z.string().trim().min(1).max(64),
  releaseId: z.string().trim().min(1).max(128),
  channel: DeploymentUpdateChannelSchema,
  theme: z.string().trim().min(1).max(64),
  contentSource: z.enum(["hub", "fixtures"]),
  storage: z.enum(["fs", "s3"]),
  installedAt: z.string().trim().min(1),
  capabilities: z.array(z.string().trim().min(1).max(80)).default([]),
});
export type DeploymentIdentity = z.infer<typeof DeploymentIdentitySchema>;
