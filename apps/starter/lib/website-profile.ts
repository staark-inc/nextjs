import type { WebsiteType } from "@staark/core";
import type { AdminFeature } from "@/lib/admin-features";

export type WebsiteProfile = {
  type: WebsiteType;
  label: string;
  shortLabel: string;
  description: string;
  inboxDescription: string;
  inboxKeywords: string;
};

/**
 * 11A profile registry.
 * Profiles define business context and wording only.
 * Feature access belongs to 11B entitlements.
 */
export const WEBSITE_PROFILES = {
  business: {
    type: "business",
    label: "Business / Services",
    shortLabel: "Business",
    description: "Company, consultant or local service website focused on leads.",
    inboxDescription: "Messages & enquiries",
    inboxKeywords: "forms submissions messages enquiries leads customers",
  },
  salon: {
    type: "salon",
    label: "Salon / Beauty",
    shortLabel: "Salon",
    description: "Salon, beauty, wellness or appointment-led local business.",
    inboxDescription: "Client enquiries",
    inboxKeywords: "forms submissions messages enquiries clients appointments bookings",
  },
  restaurant: {
    type: "restaurant",
    label: "Restaurant / Café",
    shortLabel: "Restaurant",
    description: "Restaurant, café or food business with guest enquiries.",
    inboxDescription: "Guest enquiries",
    inboxKeywords: "forms submissions messages enquiries guests reservations bookings tables",
  },
  hotel: {
    type: "hotel",
    label: "Hotel / Accommodation",
    shortLabel: "Accommodation",
    description: "Hotel, guesthouse or accommodation website.",
    inboxDescription: "Guest enquiries",
    inboxKeywords: "forms submissions messages enquiries guests rooms stays bookings reservations",
  },
  automotive: {
    type: "automotive",
    label: "Automotive / Workshop",
    shortLabel: "Automotive",
    description: "Workshop, tyre service, detailing or other automotive business.",
    inboxDescription: "Service enquiries",
    inboxKeywords: "forms submissions messages enquiries service customers vehicles appointments bookings",
  },
  portfolio: {
    type: "portfolio",
    label: "Portfolio / Agency",
    shortLabel: "Portfolio",
    description: "Portfolio, studio or agency website focused on project enquiries.",
    inboxDescription: "Project enquiries",
    inboxKeywords: "forms submissions messages enquiries projects clients leads",
  },
  custom: {
    type: "custom",
    label: "Custom website",
    shortLabel: "Custom",
    description: "Flexible profile for websites outside the standard business types.",
    inboxDescription: "Messages & bookings",
    inboxKeywords: "forms submissions messages bookings enquiries leads",
  },
} satisfies Record<WebsiteType, WebsiteProfile>;

export const WEBSITE_PROFILE_OPTIONS = Object.values(WEBSITE_PROFILES);
export const WEBSITE_PROFILE_CHANGED_EVENT = "staark:website-profile-changed";

export function normalizeWebsiteType(value: unknown): WebsiteType {
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(WEBSITE_PROFILES, value)) {
    return value as WebsiteType;
  }
  return "business";
}

export function resolveWebsiteProfile(value: unknown): WebsiteProfile {
  return WEBSITE_PROFILES[normalizeWebsiteType(value)];
}

/**
 * Website profiles that currently have a real editable services catalog.
 *
 * Keep this aligned with the storage/domain implementation. Do not expose the
 * module for another vertical until that vertical has a supported catalog.
 */
export const SERVICES_CATALOG_WEBSITE_TYPES = [
  "salon",
] as const satisfies readonly WebsiteType[];

export function supportsServicesCatalog(
  value: unknown,
): boolean {
  const type = normalizeWebsiteType(value);

  return (
    SERVICES_CATALOG_WEBSITE_TYPES as readonly WebsiteType[]
  ).includes(type);
}

/**
 * Client-facing product modules.
 *
 * The platform may support many more admin capabilities internally, but client
 * accounts only see the modules that make sense for their type of business.
 *
 * Manager accounts are intentionally not restricted by this list.
 */
const BASE_CLIENT_FEATURES: readonly AdminFeature[] = [
  "dashboard",
  "inbox",
  "pages",
  "media",
  "navigation",
  "design",
  "seo",
  "settings",
];

const FLEXIBLE_CLIENT_FEATURES: readonly AdminFeature[] = [
  ...BASE_CLIENT_FEATURES,
];

export const CLIENT_PRODUCT_WEBSITE_TYPES = [
  "salon",
  "automotive",
  "restaurant",
  "custom",
] as const;

export type ClientProductWebsiteType =
  (typeof CLIENT_PRODUCT_WEBSITE_TYPES)[number];

const CLIENT_FEATURES_BY_PROFILE = {
  // Legacy profiles remain readable for existing installations.
  business: FLEXIBLE_CLIENT_FEATURES,

  salon: [
    ...BASE_CLIENT_FEATURES,
    "booking",
    "services",
  ],

  restaurant: [
    ...BASE_CLIENT_FEATURES,
    "booking",
  ],

  hotel: [
    ...BASE_CLIENT_FEATURES,
    "booking",
  ],

  automotive: [
    ...BASE_CLIENT_FEATURES,
    "booking",
  ],

  portfolio: FLEXIBLE_CLIENT_FEATURES,

  custom: FLEXIBLE_CLIENT_FEATURES,
} satisfies Record<WebsiteType, readonly AdminFeature[]>;

type ClientNavigationCopy = {
  inboxLabel: string;
  inboxDescription: string;
  bookingLabel: string;
  bookingDescription: string;
};

const CLIENT_NAVIGATION_BY_PROFILE = {
  business: {
    inboxLabel: "Inbox",
    inboxDescription: "Messages & enquiries",
    bookingLabel: "Bookings",
    bookingDescription: "Booking requests",
  },

  salon: {
    inboxLabel: "Messages",
    inboxDescription: "Client messages",
    bookingLabel: "Appointments",
    bookingDescription: "Client appointments",
  },

  restaurant: {
    inboxLabel: "Messages",
    inboxDescription: "Guest messages",
    bookingLabel: "Reservations",
    bookingDescription: "Table reservations",
  },

  hotel: {
    inboxLabel: "Messages",
    inboxDescription: "Guest messages",
    bookingLabel: "Reservations",
    bookingDescription: "Guest reservations",
  },

  automotive: {
    inboxLabel: "Requests",
    inboxDescription: "Customer enquiries",
    bookingLabel: "Service requests",
    bookingDescription: "Workshop requests",
  },

  portfolio: {
    inboxLabel: "Enquiries",
    inboxDescription: "Project enquiries",
    bookingLabel: "Bookings",
    bookingDescription: "Booking requests",
  },

  custom: {
    inboxLabel: "Inbox",
    inboxDescription: "Messages & enquiries",
    bookingLabel: "Bookings",
    bookingDescription: "Booking requests",
  },
} satisfies Record<WebsiteType, ClientNavigationCopy>;

export function resolveClientFeatures(
  value: unknown,
  availableFeatures: readonly AdminFeature[] = [],
): readonly AdminFeature[] {
  const type = normalizeWebsiteType(value);
  const result = [...CLIENT_FEATURES_BY_PROFILE[type]];

  // Generic/custom installs may enable booking as an optional entitlement.
  // Vertical products that require bookings already include it in their profile.
  if (
    (type === "business" || type === "portfolio" || type === "custom") &&
    availableFeatures.includes("booking") &&
    !result.includes("booking")
  ) {
    result.push("booking");
  }

  return result;
}

export function resolveClientNavigation(
  value: unknown,
): ClientNavigationCopy {
  return CLIENT_NAVIGATION_BY_PROFILE[normalizeWebsiteType(value)];
}

