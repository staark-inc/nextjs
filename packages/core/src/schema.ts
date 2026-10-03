import { z } from "zod";

// Zod 4: object defaults use .prefault() so inner field defaults are applied.
/**
 * Content model shared by Staark Hub and every Next.js site.
 *
 * Staark Hub is the source of truth. The site only reads these shapes and
 * validates them at the edge of the system, so a broken Hub payload fails loudly
 * in one place instead of deep inside a theme component.
 */

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type Link = z.infer<typeof LinkSchema>;

export const ImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type Image = z.infer<typeof ImageSchema>;

/** Token overrides use the same keys as the WordPress preset files. */
export const TokenOverridesSchema = z
  .object({
    colors: z.record(z.string(), z.string()).optional(),
    typography: z.record(z.string(), z.string()).optional(),
    radius: z.record(z.string(), z.string()).optional(),
    layout: z.record(z.string(), z.string()).optional(),
  })
  .partial();
export type TokenOverrides = z.infer<typeof TokenOverridesSchema>;

/**
 * Product profile for a Staark Next website.
 * Separate from the visual theme: this describes the business/use-case.
 */
export const WEBSITE_TYPES = [
  "business",
  "salon",
  "restaurant",
  "hotel",
  "automotive",
  "portfolio",
  "custom",
] as const;
export const WebsiteTypeSchema = z.enum(WEBSITE_TYPES);
export type WebsiteType = z.infer<typeof WebsiteTypeSchema>;

export const SiteSettingsSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  /** Business/use-case profile. Independent from the visual theme. */
  websiteType: WebsiteTypeSchema.default("business"),
  locale: z.string().default("sv-SE"),
  /** Canonical public origin, e.g. https://salongnova.se */
  url: z.string().url(),
  theme: z
    .object({
      /** Runtime theme family. Falls back to STAARK_THEME when omitted. */
      family: z.string().regex(/^[a-z0-9-]+$/).optional(),
      /** Preset id inside the installed theme (e.g. "salong"). */
      preset: z.string().optional(),
      overrides: TokenOverridesSchema.optional(),
      components: z.record(z.string(), z.string()).optional(),
      studio: z
        .object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string().min(1),
          sourceUpdatedAt: z.string(),
          appliedAt: z.string(),
        })
        .optional(),
    })
    .prefault({}),
  brand: z
    .object({
      logo: ImageSchema.optional(),
      copyright: z.string().optional(),
    })
    .prefault({}),
  contact: z
    .object({
      email: z.string().email().default("contact@staarkinc.com"),
      phone: z.string().optional(),
      address: z
        .object({
          street: z.string(),
          postalCode: z.string(),
          city: z.string(),
          country: z.string().default("SE"),
        })
        .optional(),
      openingHours: z.array(z.object({ days: z.string(), hours: z.string() })).default([]),
    })
    .prefault({}),
  email: z
    .object({
      fromName: z.string().trim().min(1).max(160).optional(),
      replyTo: z.string().trim().email().optional(),
      notificationEmail: z.string().trim().email().optional(),
      bookingConfirmationEnabled: z.boolean().default(true),
      bookingDeclineEnabled: z.boolean().default(true),
      contactNotificationEnabled: z.boolean().default(true),
    })
    .prefault({}),
  analytics: z
    .object({
      googleAnalytics: z
        .object({
          enabled: z.boolean().default(false),

          measurementId: z
            .string()
            .trim()
            .regex(
              /^G-[A-Z0-9]+$/,
              "Google Analytics Measurement ID must look like G-XXXXXXXXXX.",
            )
            .optional(),

          propertyId: z
            .string()
            .trim()
            .regex(
              /^\d+$/,
              "Google Analytics Property ID must contain numbers only.",
            )
            .optional(),

          consentRequired: z.boolean().default(true),
        })
        .prefault({}),
    })
    .prefault({}),

  privacy: z
    .object({
      cookieBannerEnabled: z.boolean().default(true),
      analyticsConsentEnabled: z.boolean().default(true),
      marketingConsentEnabled: z.boolean().default(false),
      consentVersion: z.string().trim().min(1).max(40).default("1"),
      bannerTitle: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .default("Vi använder cookies"),
      bannerDescription: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .default(
          "Vi använder nödvändiga cookies för att webbplatsen ska fungera. Med ditt samtycke kan vi också använda analyscookies för att förstå hur webbplatsen används."
        ),
      privacyPolicyPath: z
        .string()
        .trim()
        .regex(/^\/[a-z0-9\-/]*$/i)
        .default("/integritet"),
      cookiePolicyPath: z
        .string()
        .trim()
        .regex(/^\/[a-z0-9\-/]*$/i)
        .default("/cookies"),

      privacyPolicy: z
        .object({
          title: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .default("Integritetspolicy"),

          intro: z
            .string()
            .trim()
            .max(3000)
            .default(
              "Här beskriver vi hur personuppgifter behandlas när du använder webbplatsen eller kontaktar oss."
            ),

          personalData: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Vi behandlar de personuppgifter som du själv lämnar via webbplatsens formulär, till exempel namn, e-postadress, telefonnummer och meddelanden."
            ),

          purpose: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Uppgifterna används för att kunna svara på förfrågningar, hantera bokningar och tillhandahålla den tjänst du kontaktar oss om."
            ),

          analytics: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Webbplatsen kan samla in integritetsvänlig aggregerad trafikstatistik. Externa analystjänster som kräver cookies aktiveras först efter ditt samtycke."
            ),

          rights: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Du kan kontakta oss om du vill veta vilka personuppgifter vi behandlar om dig eller begära rättelse eller radering när detta är tillämpligt."
            ),
        })
        .prefault({}),

      cookiePolicy: z
        .object({
          title: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .default("Cookiepolicy"),

          intro: z
            .string()
            .trim()
            .max(3000)
            .default(
              "Här förklarar vi vilka typer av cookies och lokal lagring som kan användas på webbplatsen."
            ),

          necessary: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Nödvändiga funktioner kan användas för säkerhet, inloggning och för att komma ihåg dina cookieinställningar."
            ),

          analytics: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Staarks egen trafikmätning använder aggregerade sidvisningar och kräver inte analyscookies. Externa analystjänster, exempelvis Google Analytics, får endast använda analyslagring när du har godkänt detta."
            ),

          marketing: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Marknadsföringsrelaterad lagring används endast när du uttryckligen har godkänt marknadsföring."
            ),

          choices: z
            .string()
            .trim()
            .max(5000)
            .default(
              "Du kan neka valfria cookies i cookiebannern och senare ändra ditt val via länken Cookieinställningar i sidfoten."
            ),
        })
        .prefault({}),
    })
    .prefault({}),
  navigation: z
    .object({
      primary: z.array(LinkSchema).default([]),
      footer: z.array(LinkSchema).default([]),
      footerColumns: z
        .array(
          z.object({
            title: z.string().min(1).max(80),
            links: z.array(LinkSchema).max(20).default([]),
          }),
        )
        .max(4)
        .default([]),
      cta: LinkSchema.optional(),
    })
    .prefault({}),
  seo: z
    .object({
      titleTemplate: z.string().default("%s"),
      defaultDescription: z.string().optional(),
      ogImage: z.string().optional(),
      /** schema.org type for the site's LocalBusiness JSON-LD, e.g. "HairSalon". */
      businessType: z.string().default("LocalBusiness"),
    })
    .prefault({}),
});
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

/**
 * A block is the Next.js equivalent of a WordPress block pattern instance.
 * `type` picks a section from the active theme; `props` is validated by that
 * section's own schema.
 */
export const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
});
export type Block = z.infer<typeof BlockSchema>;

export const PageSeoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    noindex: z.boolean().default(false),
  })
  .prefault({});

export const PageSchema = z.object({
  /** Normalized path: "/" or "/priser" (no trailing slash). */
  path: z.string().regex(/^\/[a-z0-9\-/]*$/i),
  title: z.string().min(1),
  seo: PageSeoSchema,
  blocks: z.array(BlockSchema).default([]),
  updatedAt: z.string().optional(),
});
export type Page = z.infer<typeof PageSchema>;

export const PageSummarySchema = z.object({
  path: z.string(),
  updatedAt: z.string().optional(),
  noindex: z.boolean().default(false),
});
export type PageSummary = z.infer<typeof PageSummarySchema>;

export const SUBMISSION_KINDS = ["contact", "lead", "booking"] as const;
export const SubmissionKindSchema = z.enum(SUBMISSION_KINDS);
export type SubmissionKind = z.infer<typeof SubmissionKindSchema>;

const CONTACT_FIELDS = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
} as const;

const ContactFieldsSchema = z.object(CONTACT_FIELDS).strict();

const LEAD_FIELDS = {
  ...CONTACT_FIELDS,
  package: z.string().trim().max(160).optional(),
  website_url: z.string().trim().max(500).optional(),
} as const;

const LeadFieldsSchema = z.object(LEAD_FIELDS).strict();

const BookingFieldsSchema = z
  .object({
    ...CONTACT_FIELDS,
    booking_type: z.string().trim().max(80).optional(),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    booking_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    booking_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    booking_guests: z.coerce.number().int().min(1).max(500).optional(),
    booking_item: z.string().trim().max(160).optional(),
  })
  .strict();

const SubmissionEnvelopeSchema = z.object({
  formId: z.string().regex(/^[a-z0-9\-_]{1,64}$/),
  token: z.string().min(10).max(200),
  website: z.string().max(0).optional().default(""),
  pageUrl: z.string().max(500).optional(),
});

export const ContactSubmissionSchema = SubmissionEnvelopeSchema.extend({
  kind: z.literal("contact"),
  fields: ContactFieldsSchema,
});

export const LeadSubmissionSchema = SubmissionEnvelopeSchema.extend({
  kind: z.literal("lead"),
  fields: LeadFieldsSchema,
});

export const BookingSubmissionSchema = SubmissionEnvelopeSchema.extend({
  kind: z.literal("booking"),
  fields: BookingFieldsSchema,
});

function submissionRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function inferSubmissionKind(formId: unknown, fields: unknown): SubmissionKind {
  const id = typeof formId === "string" ? formId.toLowerCase() : "";
  const values = submissionRecord(fields);

  if (
    id.includes("booking") ||
    id.includes("bokning") ||
    "booking_type" in values ||
    "booking_date" in values ||
    "booking_end_date" in values ||
    "booking_time" in values ||
    "booking_guests" in values ||
    "booking_item" in values
  ) {
    return "booking";
  }

  return "contact";
}

const StrictFormSubmissionSchema = z.discriminatedUnion("kind", [
  ContactSubmissionSchema,
  LeadSubmissionSchema,
  BookingSubmissionSchema,
]);

export const FormSubmissionSchema = z.preprocess((value) => {
  const raw = submissionRecord(value);
  if (SubmissionKindSchema.safeParse(raw.kind).success) return value;

  return {
    ...raw,
    kind: inferSubmissionKind(raw.formId, raw.fields),
  };
}, StrictFormSubmissionSchema);

export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

export type FormResult = { ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Cache tags the Hub sends to the revalidation webhook. */
export const cacheTags = {
  all: "staark",
  site: "staark:site",
  pages: "staark:pages",
  page: (path: string) => `staark:page:${normalizePath(path)}`,
} as const;

export function normalizePath(input: string | string[] | undefined): string {
  const joined = Array.isArray(input) ? input.join("/") : input ?? "";
  const trimmed = joined.replace(/^\/+|\/+$/g, "").toLowerCase();
  return trimmed === "" ? "/" : `/${trimmed}`;
}
