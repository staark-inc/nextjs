import { listInboxSubmissions } from "@/lib/admin-inbox";
import { runSiteHealth } from "@/lib/admin-site-health";

export type ShellHealthStatus = "ok" | "warning" | "error" | "unknown";

export type AdminShellStatus = {
  inbox: {
    /** Every submission with status "new", bookings included. */
    unread: number;
    /** New submissions that are not booking requests. */
    unreadMessages: number;
    pendingBookings: number;
  };
  health: {
    status: ShellHealthStatus;
    errors: number;
    warnings: number;
    checkedAt: string | null;
  };
};

const HEALTH_CACHE_MS = 60_000;

type HealthCache = { value: AdminShellStatus["health"]; at: number; pending?: Promise<AdminShellStatus["health"]> };
const globalForHealth = globalThis as typeof globalThis & { __staarkShellHealth?: HealthCache };

const UNKNOWN_HEALTH: AdminShellStatus["health"] = { status: "unknown", errors: 0, warnings: 0, checkedAt: null };

async function scanHealth(): Promise<AdminShellStatus["health"]> {
  try {
    const report = await runSiteHealth();
    const { errors, warnings } = report.counts;
    return {
      status: errors ? "error" : warnings ? "warning" : "ok",
      errors,
      warnings,
      checkedAt: report.checkedAt,
    };
  } catch {
    return UNKNOWN_HEALTH;
  }
}

/**
 * The full health scan reads every page and upload, so the shell reuses a
 * result for a minute instead of scanning on every navigation.
 */
async function cachedHealth(force = false): Promise<AdminShellStatus["health"]> {
  const cache = globalForHealth.__staarkShellHealth;
  const now = Date.now();
  if (!force && cache && now - cache.at < HEALTH_CACHE_MS) return cache.value;
  if (cache?.pending) return cache.pending;

  const pending = scanHealth();
  globalForHealth.__staarkShellHealth = { value: cache?.value ?? UNKNOWN_HEALTH, at: cache?.at ?? 0, pending };
  const value = await pending;
  globalForHealth.__staarkShellHealth = { value, at: Date.now() };
  return value;
}

async function inboxCounts(): Promise<AdminShellStatus["inbox"]> {
  try {
    const inbox = await listInboxSubmissions();
    return {
      unread: inbox.filter((item) => item.status === "new").length,
      unreadMessages: inbox.filter((item) => item.status === "new" && !item.bookingStatus).length,
      pendingBookings: inbox.filter((item) => item.bookingStatus === "pending").length,
    };
  } catch {
    return { unread: 0, unreadMessages: 0, pendingBookings: 0 };
  }
}

export async function getAdminShellStatus(options: { refreshHealth?: boolean } = {}): Promise<AdminShellStatus> {
  const [inbox, health] = await Promise.all([inboxCounts(), cachedHealth(options.refreshHealth)]);
  return { inbox, health };
}

/**
 * For the first server render: inbox counts plus whatever health result is
 * already cached. Never waits for a scan; the shell fetches the rest.
 */
export async function peekAdminShellStatus(): Promise<AdminShellStatus> {
  const inbox = await inboxCounts();
  return { inbox, health: globalForHealth.__staarkShellHealth?.value ?? UNKNOWN_HEALTH };
}
