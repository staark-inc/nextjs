import {
  sendSubmissionNotification,
  type SubmissionNotificationInput,
} from "@staark/platform/server";
import { readContentJson } from "@/lib/storage";

type LocalSubmission = Pick<
  SubmissionNotificationInput,
  "formId" | "kind" | "fields" | "pageUrl"
>;

type NotificationMode = "hub" | "local" | "disabled";

function notificationMode(): NotificationMode {
  const raw = process.env.STAARK_NOTIFICATION_MODE?.trim().toLowerCase();
  if (!raw || raw === "hub") return "hub";
  if (raw === "local") return "local";
  if (raw === "disabled") return "disabled";

  console.warn(
    `[staark] Unknown STAARK_NOTIFICATION_MODE=${raw}; falling back to hub.`,
  );
  return "hub";
}

function adminBaseUrl(): string | undefined {
  const explicit = process.env.STAARK_ADMIN_BASE_URL?.trim();
  if (!explicit) return undefined;

  try {
    const url = new URL(explicit);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export async function notifyLocalSubmission(
  submission: LocalSubmission,
): Promise<void> {
  if (notificationMode() !== "local") return;

  const to = process.env.STAARK_NOTIFICATION_TO?.trim();
  if (!to) {
    throw new Error(
      "STAARK_NOTIFICATION_TO is required when STAARK_NOTIFICATION_MODE=local.",
    );
  }

  const site = await readContentJson<{ name?: string }>("site.json");
  const siteName = site?.name?.trim() || "Website";
  const baseUrl = adminBaseUrl();

  await sendSubmissionNotification({
    ...submission,
    siteName,
    to,
    ...(baseUrl ? { inboxUrl: `${baseUrl}/admin/forms` } : {}),
  });
}
