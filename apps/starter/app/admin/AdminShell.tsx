"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LogoutLink from "./LogoutLink";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
};

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Overview",
    icon: "M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z",
  },
  {
    href: "/admin/pages",
    label: "Pages",
    description: "Content",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 1v5h5 M8 13h8 M8 17h6",
  },
  {
    href: "/admin/navigation",
    label: "Navigation",
    description: "Menus & links",
    icon: "M4 6h16 M4 12h10 M4 18h16 M18 10l2 2-2 2",
  },
  {
    href: "/admin/media",
    label: "Media",
    description: "Images & assets",
    icon: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm0 12 4.5-4.5 3 3 2-2 6.5 6.5 M15.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  },
  {
    href: "/admin/seo",
    label: "SEO",
    description: "Search visibility",
    icon: "M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15 M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15",
  },
  {
    href: "/admin/redirects",
    label: "Redirects",
    description: "URL forwarding",
    icon: "M5 7h10a4 4 0 0 1 4 4v1 M15 9l4-4 4 4 M19 17H9a4 4 0 0 1-4-4v-1 M9 15l-4 4-4-4",
  },
  {
    href: "/admin/health",
    label: "Site Health",
    description: "Diagnostics",
    icon: "M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3Z M9 12l2 2 4-5",
  },
  {
    href: "/admin/backups",
    label: "Backups",
    description: "Restore & recovery",
    icon: "M12 3a9 9 0 1 1-8.49 6 M3 4v5h5 M12 7v5l3 2",
  },
  {
    href: "/admin/forms",
    label: "Inbox",
    description: "Form submissions",
    icon: "M4 4h16v16H4V4Zm0 3 8 6 8-6",
  },
  {
    href: "/admin/themes",
    label: "Themes",
    description: "Look & presets",
    icon: "M12 2 3 7l9 5 9-5-9-5ZM3 12l9 5 9-5 M3 17l9 5 9-5",
  },
  {
    href: "/admin/site",
    label: "Settings",
    description: "Business details",
    icon: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 3.46-.09-.03a1.65 1.65 0 0 0-1.82.33l-.24.14a1.65 1.65 0 0 0-.8 1.63V22h-4v-.09a1.65 1.65 0 0 0-.8-1.63l-.24-.14a1.65 1.65 0 0 0-1.82-.33l-.09.03-2-3.46.06-.06A1.65 1.65 0 0 0 6.6 15v-.28a1.65 1.65 0 0 0-.93-1.49l-.08-.04v-4l.08-.04a1.65 1.65 0 0 0 .93-1.49V7.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-3.46.09.03a1.65 1.65 0 0 0 1.82-.33l.24-.14a1.65 1.65 0 0 0 .8-1.63V0h4v.09a1.65 1.65 0 0 0 .8 1.63l.24.14a1.65 1.65 0 0 0 1.82.33l.09-.03 2 3.46-.06.06a1.65 1.65 0 0 0-.33 1.82v.28c0 .64.36 1.22.93 1.49l.08.04v4l-.08.04a1.65 1.65 0 0 0-.93 1.49V15Z",
  },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentSection(pathname: string) {
  return navItems.find((item) => isActive(pathname, item.href))?.label ?? "Admin";
}

export default function AdminShell({ children, username }: { children: React.ReactNode; username: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sa-shell sa-shell--v2">
      <aside className={`sa-sidebar sa-sidebar--v2${open ? " sa-sidebar--open" : ""}`} aria-label="Admin navigation">
        <div className="sa-sidebar__brand sa-sidebar__brand--v2">
          <a className="sa-brand" href="/admin" aria-label="Staark admin dashboard">
            <span className="sa-logo sa-logo--v2">S</span>
            <span className="sa-brand__copy">
              <strong>Staark</strong>
              <small>Next Platform</small>
            </span>
          </a>
          <button className="sa-sidebar__close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            ×
          </button>
        </div>

        <div className="sa-sidebar__section-label">Website</div>
        <ul className="sa-nav sa-nav--v2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <a className={`sa-nav__link${active ? " sa-nav__link--active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}>
                  <span className="sa-nav__icon"><Icon d={item.icon} /></span>
                  <span className="sa-nav__copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="sa-sidebar__spacer" />

        <div className="sa-sidebar__user sa-sidebar__user--v2">
          <div className="sa-sidebar__avatar">{username[0]?.toUpperCase() ?? "A"}</div>
          <div className="sa-sidebar__user-copy">
            <strong>{username}</strong>
            <span>Administrator</span>
          </div>
        </div>

        <div className="sa-sidebar__footer sa-sidebar__footer--v2">
          <LogoutLink>
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} />
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
            <span>Local administration</span>
            <strong>{currentSection(pathname)}</strong>
          </div>
          <div className="sa-topbar__actions">
            <span className="sa-topbar__pill">Client deployment</span>
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
    </div>
  );
}
