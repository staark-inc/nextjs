"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminShellStatus } from "@/lib/admin-shell-status";
import LogoutLink from "./LogoutLink";
import BrandMark from "./BrandMark";
import CommandPalette from "./CommandPalette";
import AdminIcon from "./AdminIcon";
import { ADMIN_STATUS_CHANGED_EVENT } from "./admin-events";
import { adminNavGroups, adminNavItems, isNavActive, SEARCH_ICON, type AdminNavItem } from "./admin-nav";
import styles from "./AdminShell.module.css";

type AdminShellProps = {
  children: React.ReactNode;
  username: string;
  sessionExpiresAt: number;
  initialStatus: AdminShellStatus;
  development: boolean;
};

const STATUS_REFRESH_MS = 60_000;
const SESSION_WARNING_MS = 15 * 60_000;

function currentSection(pathname: string) {
  return adminNavItems.find((item) => isNavActive(pathname, item.href))?.label ?? "Admin";
}

function loginUrlForExpiredSession(): string {
  const here = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ reason: "expired" });
  if (here !== "/admin") params.set("next", here);
  return `/admin/login?${params.toString()}`;
}

function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function healthLabel(health: AdminShellStatus["health"]): string {
  if (health.status === "error") return `${health.errors} site error${health.errors === 1 ? "" : "s"}`;
  if (health.status === "warning") return `${health.warnings} warning${health.warnings === 1 ? "" : "s"}`;
  if (health.status === "ok") return "Site healthy";
  return "Site status";
}

function NavBadges({ item, status }: { item: AdminNavItem; status: AdminShellStatus }) {
  if (item.badge !== "inbox") return null;
  const { unread, pendingBookings } = status.inbox;
  if (!unread && !pendingBookings) return null;
  return (
    <span className={styles.badges}>
      {pendingBookings ? (
        <span className={`${styles.badge} ${styles.badgeWarning}`} title={`${pendingBookings} pending booking${pendingBookings === 1 ? "" : "s"}`}>
          {pendingBookings}
          <span className={styles.srOnly}> pending bookings</span>
        </span>
      ) : null}
      {unread ? (
        <span className={styles.badge} title={`${unread} new message${unread === 1 ? "" : "s"}`}>
          {unread}
          <span className={styles.srOnly}> new messages</span>
        </span>
      ) : null}
    </span>
  );
}

export default function AdminShell({ children, username, sessionExpiresAt, initialStatus, development }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [status, setStatus] = useState<AdminShellStatus>(initialStatus);
  const [now, setNow] = useState(() => Date.now());
  const redirecting = useRef(false);

  const goToLogin = useCallback(() => {
    if (redirecting.current) return;
    redirecting.current = true;
    window.location.assign(loginUrlForExpiredSession());
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shell/status", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as AdminShellStatus);
    } catch {
      // Keep the last known counts; the next refresh tries again.
    }
  }, []);

  // Close the mobile menu and refresh badge counts on every navigation.
  useEffect(() => {
    setOpen(false);
    void refreshStatus();
  }, [pathname, refreshStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshStatus(), STATUS_REFRESH_MS);
    const onFocus = () => void refreshStatus();
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_STATUS_CHANGED_EVENT, onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_STATUS_CHANGED_EVENT, onFocus);
    };
  }, [refreshStatus]);

  // Any admin API call that comes back 401 means the session is gone:
  // send the user to sign in and bring them back to this page afterwards.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const res = await originalFetch(input, init);
      if (res.status === 401) {
        try {
          const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          const url = new URL(raw, window.location.origin);
          if (
            url.origin === window.location.origin &&
            url.pathname.startsWith("/api/admin/") &&
            !url.pathname.startsWith("/api/admin/auth/")
          ) {
            goToLogin();
          }
        } catch {
          // Not a URL we can reason about; leave the response alone.
        }
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [goToLogin]);

  // Session countdown in the sidebar; sign in again once it runs out.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remainingMs = sessionExpiresAt - now;
  useEffect(() => {
    if (remainingMs <= 0) goToLogin();
  }, [remainingMs, goToLogin]);
  const sessionEndingSoon = remainingMs > 0 && remainingMs <= SESSION_WARNING_MS;

  // ⌘K / Ctrl+K opens the command palette from anywhere in the admin.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const health = status.health;
  const healthTone =
    health.status === "error"
      ? styles.healthError
      : health.status === "warning"
        ? styles.healthWarning
        : health.status === "ok"
          ? styles.healthOk
          : styles.healthUnknown;

  return (
    <div className="sa-shell sa-shell--v2">
      <aside className={`sa-sidebar sa-sidebar--v2${open ? " sa-sidebar--open" : ""}`} aria-label="Admin navigation">
        <div className="sa-sidebar__brand sa-sidebar__brand--v2">
          <Link className="sa-brand" href="/admin" aria-label="Staark admin dashboard">
            <span className="sa-logo sa-logo--v2 sa-logo--brand" aria-hidden="true">
              <BrandMark className="sa-logo__mark" />
            </span>
            <span className="sa-brand__copy">
              <strong>Staark Hub</strong>
              <small>NextJS Platform</small>
            </span>
          </Link>
          <button className="sa-sidebar__close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            ×
          </button>
        </div>

        <button className={styles.searchButton} type="button" onClick={() => setPaletteOpen(true)}>
          <AdminIcon d={SEARCH_ICON} size={15} />
          <span>Search or jump to…</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>

        <div className="sa-sidebar__nav-groups">
          {adminNavGroups.map((group) => (
            <section className="sa-sidebar__nav-group" key={group} aria-label={group}>
              <div className="sa-sidebar__section-label">{group}</div>
              <ul className="sa-nav sa-nav--v2">
                {adminNavItems.filter((item) => item.group === group).map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        className={`sa-nav__link ${styles.navLink}${active ? " sa-nav__link--active" : ""}`}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="sa-nav__icon"><AdminIcon d={item.icon} /></span>
                        <span className="sa-nav__copy">
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <NavBadges item={item} status={status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="sa-sidebar__spacer" />

        <div className="sa-sidebar__user sa-sidebar__user--v2">
          <div className="sa-sidebar__avatar">{username[0]?.toUpperCase() ?? "A"}</div>
          <div className="sa-sidebar__user-copy">
            <strong>{username}</strong>
            <span className={sessionEndingSoon ? styles.sessionWarning : undefined}>
              {sessionEndingSoon ? `Session ends in ${formatRemaining(remainingMs)}` : `Signed in · ${formatRemaining(remainingMs)} left`}
            </span>
          </div>
        </div>

        <div className="sa-sidebar__footer sa-sidebar__footer--v2">
          <LogoutLink>
            <AdminIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} />
            Log out
          </LogoutLink>
        </div>
      </aside>

      {open ? <button className="sa-sidebar-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Close navigation" /> : null}

      <div className="sa-workspace">
        <header className="sa-topbar">
          <button className="sa-mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
            <span />
            <span />
            <span />
          </button>
          <div className="sa-topbar__context">
            <span>NextJS Platform</span>
            <strong>{currentSection(pathname)}</strong>
          </div>
          <div className="sa-topbar__actions">
            <button className={styles.topSearch} type="button" onClick={() => setPaletteOpen(true)} aria-label="Search or jump to">
              <AdminIcon d={SEARCH_ICON} size={16} />
            </button>
            <Link className={`sa-topbar__health ${healthTone}`} href="/admin/health" aria-label={`Site Health: ${healthLabel(health)}`}>
              <span className="sa-topbar__health-dot" aria-hidden="true" />
              {healthLabel(health)}
            </Link>
            {development ? <span className="sa-topbar__pill">Development</span> : null}
            <a className="sa-topbar__site-link" href="/" target="_blank" rel="noopener noreferrer">
              View site
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>

        <main className="sa-main sa-main--v2">
          <div className="sa-main__inner">{children}</div>
        </main>
      </div>

      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
}
