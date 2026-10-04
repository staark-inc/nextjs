import { getPrismaClient } from "./db/prisma";

export type SearchConsoleBindingSettings = {
  enabled: boolean;
  siteUrl: string | null;
  bound: boolean;
  verifiedAt: string | null;
};

function empty(): SearchConsoleBindingSettings {
  return {
    enabled: false,
    siteUrl: null,
    bound: false,
    verifiedAt: null,
  };
}

export async function readSearchConsoleBinding(
  siteId: string,
): Promise<SearchConsoleBindingSettings> {
  const binding =
    await getPrismaClient()
      .searchConsoleBinding
      .findUnique({
        where: { siteId },
      });

  if (!binding) return empty();

  return {
    enabled: binding.enabled,
    siteUrl: binding.siteUrl,
    bound: true,
    verifiedAt:
      binding.verifiedAt?.toISOString() ?? null,
  };
}

export class SearchConsoleBindingConflictError
extends Error {
  constructor() {
    super(
      "This Search Console property is already bound to another Staark website.",
    );
    this.name =
      "SearchConsoleBindingConflictError";
  }
}

export async function bindSearchConsoleProperty(
  input: {
    siteId: string;
    siteUrl: string;
    enabled: boolean;
  },
): Promise<SearchConsoleBindingSettings> {
  const conflict =
    await getPrismaClient()
      .searchConsoleBinding
      .findFirst({
        where: {
          siteId: {
            not: input.siteId,
          },
          siteUrl: input.siteUrl,
        },
        select: {
          siteId: true,
        },
      });

  if (conflict) {
    throw new SearchConsoleBindingConflictError();
  }

  const saved =
    await getPrismaClient()
      .searchConsoleBinding
      .upsert({
        where: {
          siteId: input.siteId,
        },
        create: {
          siteId: input.siteId,
          siteUrl: input.siteUrl,
          enabled: input.enabled,
          verifiedAt: new Date(),
        },
        update: {
          siteUrl: input.siteUrl,
          enabled: input.enabled,
          verifiedAt: new Date(),
        },
      });

  return {
    enabled: saved.enabled,
    siteUrl: saved.siteUrl,
    bound: true,
    verifiedAt:
      saved.verifiedAt?.toISOString() ?? null,
  };
}
