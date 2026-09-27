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

export const SiteSettingsSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  locale: z.string().default("sv-SE"),
  /** Canonical public origin, e.g. https://salongnova.se */
  url: z.string().url(),
  theme: z
    .object({
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
  navigation: z
    .object({
      primary: z.array(LinkSchema).default([]),
      footer: z.array(LinkSchema).default([]),
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

/** Fields a public form may send. Mirrors the WordPress `[staark_contact_form]` + booking fields. */
export const FORM_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "subject",
  "message",
  "booking_type",
  "booking_date",
  "booking_end_date",
  "booking_time",
  "booking_guests",
  "booking_item",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];

export const FormSubmissionSchema = z.object({
  formId: z.string().regex(/^[a-z0-9\-_]{1,64}$/),
  token: z.string().min(10).max(200),
  /** Honeypot: must stay empty. */
  website: z.string().max(0).optional().default(""),
  fields: z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(200),
      phone: z.string().trim().max(40).optional(),
      company: z.string().trim().max(160).optional(),
      subject: z.string().trim().max(200).optional(),
      message: z.string().trim().max(5000).optional(),
      booking_type: z.string().trim().max(80).optional(),
      booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      booking_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      booking_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      booking_guests: z.coerce.number().int().min(1).max(500).optional(),
      booking_item: z.string().trim().max(160).optional(),
    })
    .strict(),
  pageUrl: z.string().max(500).optional(),
});
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
