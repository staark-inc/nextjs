import type { WebsiteType } from "@staark/core";

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
