import type { DeploymentIdentity } from "../deployment.ts";
import { hubRequest, type HubConnection } from "../hub/connection.ts";
import {
  UpdateCheckRequestSchema,
  UpdateCheckResponseSchema,
  type UpdateCheckResponse,
} from "./protocol.ts";

export const UPDATE_HUB_PATHS = {
  check: "/api/hub/next/updates/check",
} as const;

/**
 * Ask Staark Hub whether this deployment has an update on its configured
 * channel. This only checks metadata; it never downloads, installs or restarts.
 */
export async function checkForPlatformUpdate(
  connection: HubConnection,
  deployment: DeploymentIdentity,
): Promise<UpdateCheckResponse> {
  const request = UpdateCheckRequestSchema.parse({
    schema: "staark-update-check-request/v1",
    deployment,
  });

  const response = await hubRequest<unknown>(
    connection,
    UPDATE_HUB_PATHS.check,
    {
      method: "POST",
      body: request,
      cache: false,
    },
  );

  return UpdateCheckResponseSchema.parse(response);
}
