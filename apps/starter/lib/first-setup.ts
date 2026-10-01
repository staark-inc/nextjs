import {
  PageSchema,
  SiteSettingsSchema,
  WebsiteTypeSchema,
  type Page,
  type WebsiteType,
} from "@staark/core";

import { resolvePublicContentConfig } from "./content-source";
import { getPrismaClient } from "./db/prisma";
import { hashPassword, verifyPassword } from "./password";
import { createPostgresRepositories } from "./repositories";
import {
  resolveTenantContext,
  type TenantRequestInput,
} from "./tenant-context";

export const FIRST_SETUP_THEMES = [
  "light",
  "salong",
  "skonhet",
  "el",
  "gastfrihet",
  "byra",
  "webb",
  "kreator",
] as const;

export type FirstSetupTheme = (typeof FIRST_SETUP_THEMES)[number];

export type FirstSetupInput = {
  name: string;
  url?: string;
  email: string;
  phone?: string;
  locale?: string;
  websiteType: WebsiteType;
  theme: FirstSetupTheme;
  pages?: {
    contact?: boolean;
    about?: boolean;
    services?: boolean;
  };
  owner?: {
    name: string;
    email: string;
    password: string;
  };
};

export type FirstSetupState = {
  required: boolean;
  siteKey: string;
  publicUrl: string;
  provisioned: boolean;
};

function configuredUrlFromSettings(settings: unknown): string {
  if (
    settings &&
    typeof settings === "object" &&
    "url" in settings &&
    typeof (settings as { url?: unknown }).url === "string"
  ) {
    return (settings as { url: string }).url.trim();
  }

  return "";
}

async function resolveFirstSetupTarget(
  request: TenantRequestInput = {},
): Promise<{
  siteKey: string;
  publicUrl: string;
  provisioned: boolean;
  setupCompletedAt: Date | null;
  organizationId: string | null;
}> {
  const config = resolvePublicContentConfig();

  if (config.source !== "postgres") {
    return {
      siteKey: "",
      publicUrl: "",
      provisioned: false,
      setupCompletedAt: null,
      organizationId: null,
    };
  }

  const tenant = await resolveTenantContext(request);
  const siteKey = tenant?.siteKey ?? config.siteKey;

  if (!siteKey) {
    return {
      siteKey: "",
      publicUrl: "",
      provisioned: false,
      setupCompletedAt: null,
      organizationId: null,
    };
  }

  const row = await getPrismaClient().site.findUnique({
    where: { key: siteKey },
    select: {
      settings: true,
      setupCompletedAt: true,
      organizationId: true,
    },
  });

  const publicUrl =
    tenant?.source === "domain" && tenant.hostname
      ? `https://${tenant.hostname}`
      : configuredUrlFromSettings(row?.settings);

  return {
    siteKey,
    publicUrl,
    provisioned: row !== null,
    setupCompletedAt: row?.setupCompletedAt ?? null,
    organizationId: row?.organizationId ?? tenant?.organizationId ?? null,
  };
}

export async function resolveFirstSetupState(
  request: TenantRequestInput = {},
): Promise<FirstSetupState> {
  const target = await resolveFirstSetupTarget(request);

  return {
    required:
      Boolean(target.siteKey) &&
      (!target.provisioned || target.setupCompletedAt === null),
    siteKey: target.siteKey,
    publicUrl: target.publicUrl,
    provisioned: target.provisioned,
  };
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function parseTheme(value: unknown): FirstSetupTheme {
  const theme = requiredText(value, "theme").toLowerCase();

  if (!(FIRST_SETUP_THEMES as readonly string[]).includes(theme)) {
    throw new Error(`Unsupported theme: ${theme}.`);
  }

  return theme as FirstSetupTheme;
}

function normalizeLocale(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "sv-SE";
  return value.trim();
}

function verticalPage(
  websiteType: WebsiteType,
): { path: string; title: string; blocks: Page["blocks"] } {
  if (websiteType === "salon") {
    return {
      path: "/priser",
      title: "Priser",
      blocks: [
        {
          id: "prices",
          type: "priceList",
          props: {
            eyebrow: "Priser",
            heading: "Våra priser",
            groups: [
              {
                title: "Klippning",
                items: [
                  {
                    name: "Damklippning",
                    duration: "45 min",
                    price: "595 kr",
                  },
                  {
                    name: "Herrklippning",
                    duration: "30 min",
                    price: "495 kr",
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  if (websiteType === "hotel") {
    return {
      path: "/rum",
      title: "Rum",
      blocks: [
        {
          id: "rooms",
          type: "rooms",
          props: {
            eyebrow: "Rum",
            heading: "Våra rum",
            rooms: [
              {
                name: "Standardrum",
                occupancy: "2 gäster",
                description: "Ett bekvämt rum för två.",
                price: "990 kr / natt",
                amenities: ["WiFi"],
                href: "/kontakt",
              },
            ],
          },
        },
      ],
    };
  }

  return {
    path: "/tjanster",
    title: "Tjänster",
    blocks: [
      {
        id: "services-hero",
        type: "hero",
        props: {
          eyebrow: "Tjänster",
          heading: "Så kan vi hjälpa dig",
          intro: "Lägg till och anpassa dina tjänster i Admin.",
        },
      },
    ],
  };
}

export async function isFirstSetupRequired(
  request: TenantRequestInput = {},
): Promise<boolean> {
  return (await resolveFirstSetupState(request)).required;
}

export async function createFirstSetup(
  raw: FirstSetupInput,
  request: TenantRequestInput = {},
): Promise<{
  siteKey: string;
  siteId: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
}> {
  const target = await resolveFirstSetupTarget(request);

  if (!target.siteKey) {
    throw new Error(
      "First configuration requires a provisioned tenant domain or STAARK_SITE_KEY fallback.",
    );
  }

  const siteKey = target.siteKey;
  const name = requiredText(raw.name, "name");
  const url = target.publicUrl || requiredText(raw.url, "url");
  const email = requiredText(raw.email, "email");
  const phone =
    typeof raw.phone === "string" && raw.phone.trim()
      ? raw.phone.trim()
      : undefined;
  const locale = normalizeLocale(raw.locale);
  const websiteType = WebsiteTypeSchema.parse(raw.websiteType);
  const theme = parseTheme(raw.theme);

  let owner:
    | { name: string; email: string; password: string; passwordHash: string }
    | null = null;

  if (target.organizationId) {
    const ownerName = requiredText(raw.owner?.name, "owner.name");
    const ownerEmail = requiredText(raw.owner?.email, "owner.email").toLowerCase();
    const ownerPassword = requiredText(raw.owner?.password, "owner.password");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      throw new Error("owner.email must be a valid email address.");
    }

    owner = {
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
      passwordHash: await hashPassword(ownerPassword),
    };
  }

  const includeContact = raw.pages?.contact !== false;
  const includeAbout = raw.pages?.about === true;
  const includeServices = raw.pages?.services !== false;

  const servicePage = verticalPage(websiteType);

  const navigation = [
    { label: "Hem", href: "/" },
    ...(includeServices
      ? [{ label: servicePage.title, href: servicePage.path }]
      : []),
    ...(includeAbout ? [{ label: "Om oss", href: "/om-oss" }] : []),
    ...(includeContact ? [{ label: "Kontakt", href: "/kontakt" }] : []),
  ];

  const primaryHref = includeContact
    ? "/kontakt"
    : includeServices
      ? servicePage.path
      : undefined;

  const settings = SiteSettingsSchema.parse({
    name,
    websiteType,
    locale,
    url,
    theme: { family: theme },
    contact: {
      email,
      ...(phone ? { phone } : {}),
      openingHours: [],
    },
    navigation: {
      primary: navigation,
      footer: navigation,
      footerColumns: [],
      ...(primaryHref
        ? {
            cta: {
              label: includeContact ? "Kontakta oss" : servicePage.title,
              href: primaryHref,
            },
          }
        : {}),
    },
    seo: {
      titleTemplate: `%s | ${name}`,
    },
  });

  const now = new Date().toISOString();

  const pages: Page[] = [
    PageSchema.parse({
      path: "/",
      title: "Hem",
      seo: { noindex: false },
      blocks: [
        {
          id: "hero",
          type: "hero",
          props: {
            heading: name,
            intro: "Välkommen. Anpassa text, bilder och innehåll i Admin.",
            ...(primaryHref
              ? {
                  primaryCta: {
                    label: includeContact ? "Kontakta oss" : servicePage.title,
                    href: primaryHref,
                  },
                }
              : {}),
          },
        },
      ],
      updatedAt: now,
    }),
    ...(includeServices
      ? [
          PageSchema.parse({
            path: servicePage.path,
            title: servicePage.title,
            seo: { noindex: false },
            blocks: servicePage.blocks,
            updatedAt: now,
          }),
        ]
      : []),
    ...(includeAbout
      ? [
          PageSchema.parse({
            path: "/om-oss",
            title: "Om oss",
            seo: { noindex: false },
            blocks: [
              {
                id: "about-hero",
                type: "hero",
                props: {
                  eyebrow: "Om oss",
                  heading: `Om ${name}`,
                  intro: "Berätta om företaget, teamet och vad som gör er unika.",
                },
              },
            ],
            updatedAt: now,
          }),
        ]
      : []),
    ...(includeContact
      ? [
          PageSchema.parse({
            path: "/kontakt",
            title: "Kontakt",
            seo: { noindex: false },
            blocks: [
              {
                id: "contact",
                type: "contact",
                props: {
                  eyebrow: "Kontakt",
                  heading: "Kontakta oss",
                  intro: "Skicka ett meddelande så återkommer vi.",
                  formId: "contact",
                },
              },
            ],
            updatedAt: now,
          }),
        ]
      : []),
  ];

  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.site.findUnique({
      where: { key: siteKey },
      select: {
        setupCompletedAt: true,
      },
    });

    if (existing?.setupCompletedAt) {
      throw new Error(
        `First configuration is already complete for site key "${siteKey}".`,
      );
    }

    const repositories = createPostgresRepositories(transaction);
    const site = await repositories.sites.upsertByKey({
      key: siteKey,
      settings,
    });

    for (const page of pages) {
      await repositories.pages.upsertByPath(site.id, page);
    }

    let ownerUserId: string | null = null;

    if (target.organizationId && owner) {
      const provisionedOwners = await transaction.organizationMember.findMany({
        where: {
          organizationId: target.organizationId,
          role: "owner",
        },
        select: {
          user: { select: { email: true } },
        },
      });

      if (
        provisionedOwners.length > 0 &&
        !provisionedOwners.some(
          (membership) => membership.user.email.toLowerCase() === owner.email,
        )
      ) {
        throw new Error(
          "Owner email must match the account that was provisioned for this organization.",
        );
      }

      const existingUser = await transaction.user.findUnique({
        where: { email: owner.email },
        select: {
          id: true,
          passwordHash: true,
          memberships: {
            where: { organizationId: target.organizationId },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (existingUser && existingUser.memberships.length === 0) {
        throw new Error(
          "This email already belongs to another account. Use the provisioned owner email or another address.",
        );
      }

      if (
        existingUser?.passwordHash &&
        !(await verifyPassword(owner.password, existingUser.passwordHash))
      ) {
        throw new Error(
          "This owner account already has a password. Enter its existing password to continue.",
        );
      }

      const user = existingUser
        ? await transaction.user.update({
            where: { id: existingUser.id },
            data: {
              name: owner.name,
              status: "active",
              ...(existingUser.passwordHash
                ? {}
                : { passwordHash: owner.passwordHash }),
            },
          })
        : await transaction.user.create({
            data: {
              email: owner.email,
              name: owner.name,
              status: "active",
              passwordHash: owner.passwordHash,
            },
          });

      ownerUserId = user.id;

      await transaction.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: target.organizationId,
            userId: user.id,
          },
        },
        create: {
          organizationId: target.organizationId,
          userId: user.id,
          role: "owner",
        },
        update: { role: "owner" },
      });
    }

    await transaction.site.update({
      where: { id: site.id },
      data: {
        setupCompletedAt: new Date(),
        setupTokenHash: null,
        setupTokenExpiresAt: null,
        setupClaimedAt: null,
      },
    });

    return {
      siteKey: site.key,
      siteId: site.id,
      ownerUserId,
      ownerEmail: owner?.email ?? null,
    };
  });
}
