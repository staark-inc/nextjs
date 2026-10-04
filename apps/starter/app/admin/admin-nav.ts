import type { AdminFeature } from "@/lib/admin-features";
import type { WebsiteType } from "@staark/core";
import {
  resolveClientNavigation,
  resolveWebsiteProfile,
  supportsServicesCatalog,
} from "@/lib/website-profile";

export type AdminNavGroup = "Overview" | "Business" | "Website" | "Growth" | "System";

export type AdminNavItem = {
  href: string;
  feature: AdminFeature;
  label: string;
  description: string;
  icon: string;
  group: AdminNavGroup;
  /** Which live count the sidebar shows next to this item. */
  badge?: "messages" | "bookings";
  /** Extra words the command palette matches on. */
  keywords?: string;
};

export const SEARCH_ICON = "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5";

export const adminNavGroups: AdminNavGroup[] = ["Overview", "Business", "Website", "Growth", "System"];

const BASE_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    feature: "dashboard",
    label: "Dashboard",
    description: "Overview",
    icon: "M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z",
    group: "Overview",
    keywords: "home overview",
  },
  {
    href: "/admin/updates",
    feature: "dashboard",
    label: "News & Updates",
    description: "What's new at Staark",
    icon: "M4 5h16v14H4V5Zm4 4h8 M8 12h8 M8 15h5",
    group: "Overview",
    keywords: "news updates announcements releases features maintenance staark",
  },
  {
    href: "/admin/forms",
    feature: "inbox",
    label: "Inbox",
    description: "Messages & forms",
    icon: "M4 4h16v16H4V4Zm0 3 8 6 8-6",
    group: "Business",
    badge: "messages",
    keywords: "forms submissions messages enquiries leads contact",
  },
  {
    href: "/admin/bookings",
    feature: "booking",
    label: "Bookings",
    description: "Booking requests",
    icon: "M4 6h16v14H4V6Zm0 4h16 M8 3v4 M16 3v4 M8 14h3 M13 14h3 M8 17h3",
    group: "Business",
    badge: "bookings",
    keywords: "booking appointments calendar confirm decline reservations",
  },
  {
    href: "/admin/services",
    feature: "services",
    label: "Services & prices",
    description: "Treatments, duration & prices",
    icon: "M5 5h14v14H5V5Zm3 4h8 M8 12h5 M8 15h7",
    group: "Business",
    keywords: "services prices treatments duration salon price list",
  },
  {
    href: "/admin/pages",
    feature: "pages",
    label: "Pages",
    description: "Content",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 1v5h5 M8 13h8 M8 17h6",
    group: "Website",
    keywords: "content blocks new page",
  },
  {
    href: "/admin/media",
    feature: "media",
    label: "Media",
    description: "Images & assets",
    icon: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm0 12 4.5-4.5 3 3 2-2 6.5 6.5 M15.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    group: "Website",
    keywords: "images uploads alt text files",
  },
  {
    href: "/admin/navigation",
    feature: "navigation",
    label: "Navigation",
    description: "Menus & links",
    icon: "M4 6h16 M4 12h10 M4 18h16 M18 10l2 2-2 2",
    group: "Website",
    keywords: "menu links footer",
  },
  {
    href: "/admin/themes",
    feature: "design",
    label: "Themes",
    description: "Look & presets",
    icon: "M12 2 3 7l9 5 9-5-9-5ZM3 12l9 5 9-5 M3 17l9 5 9-5",
    group: "Website",
    keywords: "design studio colors fonts preset",
  },
  {
    href: "/admin/seo",
    feature: "seo",
    label: "SEO",
    description: "Search visibility",
    icon: "M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15 M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15",
    group: "Growth",
    keywords: "search google titles descriptions",
  },
  {
    href: "/admin/search-console",
    feature: "searchConsole",
    label: "Search Console",
    description: "Google search performance",
    icon: "M4 5h16v14H4V5Zm3 10 3-3 2 2 5-6 M15 8h2v2",
    group: "Growth",
    keywords: "google search console queries clicks impressions ctr ranking position",
  },
  {
    href: "/admin/analytics",
    feature: "analytics",
    label: "Analytics",
    description: "Traffic & top pages",
    icon: "M4 19V9 M10 19V5 M16 19v-8 M22 19V3",
    group: "Growth",
    keywords: "analytics traffic visitors page views stats statistics",
  },
  {
    href: "/admin/redirects",
    feature: "redirects",
    label: "Redirects",
    description: "URL forwarding",
    icon: "M5 7h10a4 4 0 0 1 4 4v1 M15 9l4-4 4 4 M19 17H9a4 4 0 0 1-4-4v-1 M9 15l-4 4-4-4",
    group: "Growth",
    keywords: "301 302 urls forwarding",
  },
  {
    href: "/admin/health",
    feature: "health",
    label: "Site Health",
    description: "Diagnostics",
    icon: "M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3Z M9 12l2 2 4-5",
    group: "System",
    keywords: "status errors warnings diagnostics",
  },
  {
    href: "/admin/backups",
    feature: "backups",
    label: "Backups",
    description: "Restore & recovery",
    icon: "M12 3a9 9 0 1 1-8.49 6 M3 4v5h5 M12 7v5l3 2",
    group: "System",
    keywords: "restore history snapshot",
  },
  {
    href: "/admin/logs",
    feature: "system",
    label: "Logs",
    description: "Application events",
    icon: "M4 4h16v16H4V4Zm4 5h8 M8 13h8 M8 17h5",
    group: "System",
    keywords: "logs events errors warnings runtime system technical",
  },
  {
    href: "/admin/domains",
    feature: "domains",
    label: "Domains",
    description: "Addresses & verification",
    icon: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm0 0h18 M12 3a15 15 0 0 1 0 18 M12 3a15 15 0 0 0 0 18",
    group: "System",
    keywords: "domain hostname dns custom domain staark app ssl",
  },
  {
    href: "/admin/privacy",
    feature: "privacy",
    label: "Privacy & consent",
    description: "Cookies & policies",
    icon: "M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3Z M9 12l2 2 4-5",
    group: "System",
    keywords: "privacy cookies consent gdpr analytics policy",
  },
  {
    href: "/admin/plan",
    feature: "plan",
    label: "Plan & usage",
    description: "Package & limits",
    icon: "M4 5h16v14H4V5Zm0 4h16 M8 14h3 M14 14h2 M8 17h8",
    group: "System",
    keywords: "plan package subscription billing price storage limits usage",
  },
  {
    href: "/admin/profile",
    feature: "profile",
    label: "Profile & security",
    description: "Account & sign-in",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0 M18 7l2 2 3-4",
    group: "System",
    keywords: "profile account password security 2fa two factor authenticator",
  },
  {
    href: "/admin/site",
    feature: "settings",
    label: "Settings",
    description: "Business details",
    icon: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 3.46-.09-.03a1.65 1.65 0 0 0-1.82.33l-.24.14a1.65 1.65 0 0 0-.8 1.63V22h-4v-.09a1.65 1.65 0 0 0-.8-1.63l-.24-.14a1.65 1.65 0 0 0-1.82-.33l-.09.03-2-3.46.06-.06A1.65 1.65 0 0 0 6.6 15v-.28a1.65 1.65 0 0 0-.93-1.49l-.08-.04v-4l.08-.04a1.65 1.65 0 0 0 .93-1.49V7.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-3.46.09.03a1.65 1.65 0 0 0 1.82-.33l.24-.14a1.65 1.65 0 0 0 .8-1.63V0h4v.09a1.65 1.65 0 0 0 .8 1.63l.24.14a1.65 1.65 0 0 0 1.82.33l.09-.03 2 3.46-.06.06a1.65 1.65 0 0 0-.33 1.82v.28c0 .64.36 1.22.93 1.49l.08.04v4l-.08.04a1.65 1.65 0 0 0-.93 1.49V15Z",
    group: "System",
    keywords: "business contact opening hours address name",
  },
];

export function getAdminNavItems(websiteType: WebsiteType): AdminNavItem[] {
  const profile = resolveWebsiteProfile(websiteType);
  const copy = resolveClientNavigation(websiteType);

  return BASE_ADMIN_NAV_ITEMS
    .filter(
      (item) =>
        item.feature !== "services" ||
        supportsServicesCatalog(websiteType),
    )
    .map((item) => {
    if (item.href === "/admin/forms") {
      return {
        ...item,
        label: copy.inboxLabel,
        description: copy.inboxDescription,
        keywords: profile.inboxKeywords,
      };
    }

    if (item.href === "/admin/bookings") {
      return {
        ...item,
        label: copy.bookingLabel,
        description: copy.bookingDescription,
      };
    }

    return item;
  });
}

export function getAdminNavGroups(items: AdminNavItem[]): AdminNavGroup[] {
  return adminNavGroups.filter((group) => items.some((item) => item.group === group));
}

/** Backwards-compatible business defaults. */
export const adminNavItems: AdminNavItem[] = getAdminNavItems("business");

export function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
