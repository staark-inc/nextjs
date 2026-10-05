import {
  getPrismaClient,
} from "./db/prisma";

export type SearchConsoleVerificationSettings = {
  fileName: string | null;
  contentType: string | null;
  uploadedAt: string | null;
};

export type SearchConsoleBindingSettings = {
  enabled: boolean;
  siteUrl: string | null;
  bound: boolean;
  verifiedAt: string | null;
  verification: SearchConsoleVerificationSettings;
};

function empty():
SearchConsoleBindingSettings {
  return {
    enabled:
      false,

    siteUrl:
      null,

    bound:
      false,

    verifiedAt:
      null,

    verification: {
      fileName:
        null,

      contentType:
        null,

      uploadedAt:
        null,
    },
  };
}

function mapBinding(
  binding: {
    enabled: boolean;
    siteUrl: string;
    verifiedAt: Date | null;
    verificationFileName: string | null;
    verificationContentType: string | null;
    verificationUploadedAt: Date | null;
  },
): SearchConsoleBindingSettings {
  return {
    enabled:
      binding.enabled,

    siteUrl:
      binding.siteUrl,

    bound:
      true,

    verifiedAt:
      binding.verifiedAt
        ?.toISOString() ??
      null,

    verification: {
      fileName:
        binding.verificationFileName,

      contentType:
        binding.verificationContentType,

      uploadedAt:
        binding.verificationUploadedAt
          ?.toISOString() ??
        null,
    },
  };
}

export async function readSearchConsoleBinding(
  siteId: string,
): Promise<SearchConsoleBindingSettings> {
  const binding =
    await getPrismaClient()
      .searchConsoleBinding
      .findUnique({
        where: {
          siteId,
        },
      });

  if (!binding) {
    return empty();
  }

  return mapBinding(
    binding,
  );
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

async function assertPropertyAvailable(
  siteId: string,
  siteUrl: string,
): Promise<void> {
  const conflict =
    await getPrismaClient()
      .searchConsoleBinding
      .findFirst({
        where: {
          siteId: {
            not:
              siteId,
          },

          siteUrl,
        },

        select: {
          siteId:
            true,
        },
      });

  if (conflict) {
    throw new SearchConsoleBindingConflictError();
  }
}

export async function bindSearchConsoleProperty(
  input: {
    siteId: string;
    siteUrl: string;
    enabled: boolean;
  },
): Promise<SearchConsoleBindingSettings> {
  await assertPropertyAvailable(
    input.siteId,
    input.siteUrl,
  );

  const prisma =
    getPrismaClient();

  const current =
    await prisma
      .searchConsoleBinding
      .findUnique({
        where: {
          siteId:
            input.siteId,
        },

        select: {
          siteUrl:
            true,
        },
      });

  const propertyChanged =
    Boolean(
      current &&
      current.siteUrl !==
        input.siteUrl,
    );

  const saved =
    await prisma
      .searchConsoleBinding
      .upsert({
        where: {
          siteId:
            input.siteId,
        },

        create: {
          siteId:
            input.siteId,

          siteUrl:
            input.siteUrl,

          enabled:
            input.enabled,

          verifiedAt:
            new Date(),
        },

        update: {
          siteUrl:
            input.siteUrl,

          enabled:
            input.enabled,

          verifiedAt:
            new Date(),

          ...(propertyChanged
            ? {
                verificationFileName:
                  null,

                verificationContent:
                  null,

                verificationContentType:
                  null,

                verificationUploadedAt:
                  null,
              }
            : {}),
        },
      });

  return mapBinding(
    saved,
  );
}

export async function saveSearchConsoleVerification(
  input: {
    siteId: string;
    siteUrl: string;
    fileName: string;
    content: string;
    contentType: string;
  },
): Promise<SearchConsoleBindingSettings> {
  await assertPropertyAvailable(
    input.siteId,
    input.siteUrl,
  );

  const prisma =
    getPrismaClient();

  const current =
    await prisma
      .searchConsoleBinding
      .findUnique({
        where: {
          siteId:
            input.siteId,
        },

        select: {
          siteUrl:
            true,
          enabled:
            true,
          verifiedAt:
            true,
        },
      });

  const propertyChanged =
    Boolean(
      current &&
      current.siteUrl !==
        input.siteUrl,
    );

  const saved =
    await prisma
      .searchConsoleBinding
      .upsert({
        where: {
          siteId:
            input.siteId,
        },

        create: {
          siteId:
            input.siteId,

          siteUrl:
            input.siteUrl,

          enabled:
            false,

          verifiedAt:
            null,

          verificationFileName:
            input.fileName,

          verificationContent:
            input.content,

          verificationContentType:
            input.contentType,

          verificationUploadedAt:
            new Date(),
        },

        update: {
          siteUrl:
            input.siteUrl,

          ...(propertyChanged
            ? {
                enabled:
                  false,

                verifiedAt:
                  null,
              }
            : {}),

          verificationFileName:
            input.fileName,

          verificationContent:
            input.content,

          verificationContentType:
            input.contentType,

          verificationUploadedAt:
            new Date(),
        },
      });

  return mapBinding(
    saved,
  );
}

export async function deleteSearchConsoleVerification(
  siteId: string,
): Promise<boolean> {
  const prisma =
    getPrismaClient();

  const current =
    await prisma
      .searchConsoleBinding
      .findUnique({
        where: {
          siteId,
        },

        select: {
          siteId:
            true,
        },
      });

  if (!current) {
    return false;
  }

  await prisma
    .searchConsoleBinding
    .update({
      where: {
        siteId,
      },

      data: {
        verificationFileName:
          null,

        verificationContent:
          null,

        verificationContentType:
          null,

        verificationUploadedAt:
          null,
      },
    });

  return true;
}

export async function readPublicSearchConsoleVerification(
  siteId: string,
  fileName: string,
): Promise<{
  content: string;
  contentType: string;
} | null> {
  const binding =
    await getPrismaClient()
      .searchConsoleBinding
      .findFirst({
        where: {
          siteId,

          verificationFileName:
            fileName,

          verificationContent: {
            not:
              null,
          },
        },

        select: {
          verificationContent:
            true,

          verificationContentType:
            true,
        },
      });

  if (
    !binding?.verificationContent
  ) {
    return null;
  }

  return {
    content:
      binding.verificationContent,

    contentType:
      binding.verificationContentType ??
      "text/html",
  };
}
