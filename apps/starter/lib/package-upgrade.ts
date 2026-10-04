import type { AdminFeature } from "./admin-features";

export type PackageUpgradeCopy = {
  title: string;
  description: string;
};

const COPY: Partial<
  Record<AdminFeature, PackageUpgradeCopy>
> = {
  inbox: {
    title: "Customer enquiries are not included",
    description:
      "Your current package does not include customer enquiries and lead management.",
  },

  booking: {
    title: "Bookings are not included",
    description:
      "Booking and reservation management is not included in your current package.",
  },

  seo: {
    title: "SEO tools are not included",
    description:
      "Your current package does not include access to these SEO tools.",
  },

  analytics: {
    title: "Analytics are not included",
    description:
      "Website traffic and visitor analytics are not included in your current package.",
  },

  domains: {
    title: "Custom domains are not included",
    description:
      "Your current package does not include custom domain management.",
  },
};

export function packageUpgradeCopy(
  feature: AdminFeature,
): PackageUpgradeCopy {
  return (
    COPY[feature] ?? {
      title: "This feature is not included",
      description:
        "This capability is not available with your current website package.",
    }
  );
}
