/** Fired after a page changes something the shell counts (inbox, health). */
export const ADMIN_STATUS_CHANGED_EVENT =
  "staark:admin-status-changed";

/** Fired whenever the tenant-scoped server realtime stream emits an event. */
export const ADMIN_REALTIME_EVENT =
  "staark:admin-realtime";

export type AdminRealtimeBrowserEvent = {
  siteId: string;

  type:
    | "submission.received"
    | "submission.status.changed"
    | "booking.status.changed"
    | "inbox.updated"
    | "automation.started"
    | "automation.succeeded"
    | "automation.failed";

  at: string;

  data: Record<string, unknown>;
};
