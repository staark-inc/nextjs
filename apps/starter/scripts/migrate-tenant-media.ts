import {
  createHash,
} from "node:crypto";

import {
  disconnectPrismaClient,
  getPrismaClient,
} from "../lib/db/prisma";

import {
  getStorage,
  readJson as readStorageJson,
  writeJson as writeStorageJson,
} from "@staark/core/storage";

const IMAGE_EXTENSION =
  /\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i;

type MediaMetadata =
  Record<
    string,
    {
      alt?: string;
    }
  >;

function portablePath(
  value: string,
): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function storagePath(
  ...parts: string[]
): string {
  const joined =
    parts
      .map(portablePath)
      .filter(Boolean)
      .join("/");

  if (!joined) {
    throw new Error(
      "Storage path cannot be empty.",
    );
  }

  const normalized =
    joined
      .split("/")
      .filter(
        (part) =>
          part &&
          part !== "." &&
          part !== "..",
      )
      .join("/");

  if (
    !normalized ||
    normalized.includes("\0")
  ) {
    throw new Error(
      "Invalid storage path.",
    );
  }

  return normalized;
}

function stateStoragePath(
  ...parts: string[]
): string {
  return storagePath(
    ".staark",
    ...parts,
  );
}

function uploadsStoragePath(
  ...parts: string[]
): string {
  return storagePath(
    "public",
    "uploads",
    ...parts,
  );
}

function tenantStateStoragePath(
  siteId: string,
  ...parts: string[]
): string {
  return storagePath(
    "sites",
    siteId,
    ".staark",
    ...parts,
  );
}

function tenantUploadsStoragePath(
  siteId: string,
  ...parts: string[]
): string {
  return storagePath(
    "sites",
    siteId,
    "uploads",
    ...parts,
  );
}

type Options = {
  write: boolean;
  claimUnownedSiteKey:
    string | null;
  rollbackManifest:
    string | null;
};

type SiteInfo = {
  id: string;
  key: string;
  name: string;
};

type Ownership =
  Map<string, Set<string>>;

type CopyRecord = {
  name: string;
  siteId: string;
  siteKey: string;
  sourceKey: string;
  targetKey: string;
  reason:
    | "referenced"
    | "explicit-unowned-claim";
};

type Manifest = {
  version: 1;
  createdAt: string;
  legacyUploadsPrefix: string;
  legacyMetadataKey: string;
  createdKeys: string[];
  copies: CopyRecord[];
  unowned: string[];
};

function usage(): string {
  return `
Staark B2.8 tenant media migration

Dry run:
  pnpm media:migrate:tenant

Explicitly assign otherwise-unowned legacy media:
  pnpm media:migrate:tenant -- --claim-unowned <site-key>

Write:
  pnpm media:migrate:tenant -- --write --claim-unowned <site-key>

Rollback tenant copies created by one migration:
  pnpm media:migrate:tenant -- --rollback <manifest-storage-key>

Notes:
- legacy files are NEVER deleted;
- files referenced by several sites are copied to each site;
- unowned files are not guessed;
- --claim-unowned is an explicit operator ownership decision.
`.trim();
}

function parseArgs(
  argv: string[],
): Options | null {
  let write = false;

  let claimUnownedSiteKey:
    string | null = null;

  let rollbackManifest:
    string | null = null;

  for (
    let index = 0;
    index < argv.length;
    index += 1
  ) {
    const arg =
      argv[index];

    if (
      arg === "--help" ||
      arg === "-h"
    ) {
      return null;
    }

    if (
      arg === "--write"
    ) {
      write = true;
      continue;
    }

    if (
      arg ===
      "--claim-unowned"
    ) {
      const value =
        argv[index + 1];

      if (
        !value ||
        value.startsWith("--")
      ) {
        throw new Error(
          "--claim-unowned requires a site key.",
        );
      }

      claimUnownedSiteKey =
        value;

      index += 1;
      continue;
    }

    if (
      arg === "--rollback"
    ) {
      const value =
        argv[index + 1];

      if (
        !value ||
        value.startsWith("--")
      ) {
        throw new Error(
          "--rollback requires a manifest storage key.",
        );
      }

      rollbackManifest =
        value;

      index += 1;
      continue;
    }

    throw new Error(
      `Unknown argument: ${arg}`,
    );
  }

  if (
    rollbackManifest &&
    claimUnownedSiteKey
  ) {
    throw new Error(
      "--rollback cannot be combined with --claim-unowned.",
    );
  }

  return {
    write,
    claimUnownedSiteKey,
    rollbackManifest,
  };
}

function scanValue(
  value: unknown,
  found: Set<string>,
): void {
  if (
    typeof value ===
      "string"
  ) {
    for (
      const match
      of value.matchAll(
        /\/uploads\/([a-zA-Z0-9._-]+)/g,
      )
    ) {
      if (
        match[1]
      ) {
        found.add(
          match[1],
        );
      }
    }

    return;
  }

  if (
    Array.isArray(value)
  ) {
    for (
      const item of value
    ) {
      scanValue(
        item,
        found,
      );
    }

    return;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    for (
      const nested
      of Object.values(
        value as Record<
          string,
          unknown
        >,
      )
    ) {
      scanValue(
        nested,
        found,
      );
    }
  }
}

function hashBytes(
  bytes: Uint8Array,
): string {
  return createHash(
    "sha256",
  )
    .update(bytes)
    .digest("hex");
}

async function rollback(
  manifestKey: string,
): Promise<void> {
  const storage =
    getStorage();

  const manifest =
    await readStorageJson<Manifest>(
      storage,
      manifestKey,
    );

  if (!manifest) {
    throw new Error(
      `Manifest not found: ${manifestKey}`,
    );
  }

  console.log(
    `Rollback manifest: ${manifestKey}`,
  );

  console.log(
    `Tenant keys to delete: ${manifest.createdKeys.length}`,
  );

  for (
    const key
    of manifest.createdKeys
  ) {
    console.log(
      `  - ${key}`,
    );
  }

  console.log("");
  console.log(
    "Rollback is intentionally dry-run only unless --write is also supplied.",
  );
}

async function applyRollback(
  manifestKey: string,
): Promise<void> {
  const storage =
    getStorage();

  const manifest =
    await readStorageJson<Manifest>(
      storage,
      manifestKey,
    );

  if (!manifest) {
    throw new Error(
      `Manifest not found: ${manifestKey}`,
    );
  }

  for (
    const key
    of manifest.createdKeys
  ) {
    await storage.delete(
      key,
    );
  }

  console.log(
    `Deleted ${manifest.createdKeys.length} tenant-scoped key(s).`,
  );

  console.log(
    "Legacy global media was never deleted and remains untouched.",
  );
}

async function main():
Promise<void> {
  const options =
    parseArgs(
      process.argv.slice(2),
    );

  if (!options) {
    console.log(
      usage(),
    );
    return;
  }

  if (
    options.rollbackManifest
  ) {
    if (
      options.write
    ) {
      await applyRollback(
        options.rollbackManifest,
      );
    } else {
      await rollback(
        options.rollbackManifest,
      );
    }

    return;
  }

  const prisma =
    getPrismaClient();

  const storage =
    getStorage();

  const sites =
    await prisma.site.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        settings: true,

        serviceCatalog: {
          select: {
            document: true,
          },
        },

        pages: {
          select: {
            seo: true,

            blocks: {
              select: {
                props: true,
              },
            },

            revisions: {
              select: {
                snapshot: true,
              },
            },
          },
        },
      },

      orderBy: {
        key: "asc",
      },
    });

  const siteById =
    new Map<
      string,
      SiteInfo
    >();

  const siteByKey =
    new Map<
      string,
      SiteInfo
    >();

  const ownership:
    Ownership =
      new Map();

  for (
    const site of sites
  ) {
    const info: SiteInfo = {
      id:
        site.id,
      key:
        site.key,
      name:
        site.name,
    };

    siteById.set(
      info.id,
      info,
    );

    siteByKey.set(
      info.key,
      info,
    );

    const names =
      new Set<string>();

    scanValue(
      site.settings,
      names,
    );

    if (
      site.serviceCatalog
    ) {
      scanValue(
        site
          .serviceCatalog
          .document,
        names,
      );
    }

    for (
      const page
      of site.pages
    ) {
      scanValue(
        page.seo,
        names,
      );

      for (
        const block
        of page.blocks
      ) {
        scanValue(
          block.props,
          names,
        );
      }

      for (
        const revision
        of page.revisions
      ) {
        scanValue(
          revision.snapshot,
          names,
        );
      }
    }

    for (
      const name of names
    ) {
      const owners =
        ownership.get(name) ??
        new Set<string>();

      owners.add(
        site.id,
      );

      ownership.set(
        name,
        owners,
      );
    }
  }

  let claimSite:
    SiteInfo | null = null;

  if (
    options.claimUnownedSiteKey
  ) {
    claimSite =
      siteByKey.get(
        options.claimUnownedSiteKey,
      ) ?? null;

    if (!claimSite) {
      throw new Error(
        `Unknown site key: ${options.claimUnownedSiteKey}`,
      );
    }
  }

  const legacyRoot =
    uploadsStoragePath();

  const legacyPrefix =
    `${legacyRoot}/`;

  const legacyEntries =
    (
      await storage.list(
        legacyRoot,
      )
    )
      .filter(
        (entry) =>
          entry.path.startsWith(
            legacyPrefix,
          ),
      )
      .map(
        (entry) => ({
          entry,
          name:
            entry.path.slice(
              legacyPrefix.length,
            ),
        }),
      )
      .filter(
        ({ name }) =>
          Boolean(name) &&
          !name.includes("/") &&
          IMAGE_EXTENSION.test(
            name,
          ),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
          ),
      );

  const globalMetadataKey =
    stateStoragePath(
      "media.json",
    );

  const globalMetadata =
    (
      await readStorageJson<MediaMetadata>(
        storage,
        globalMetadataKey,
      )
    ) ?? {};

  const copies:
    CopyRecord[] = [];

  const unowned:
    string[] = [];

  for (
    const {
      name,
    } of legacyEntries
  ) {
    const referencedOwners =
      ownership.get(name);

    if (
      referencedOwners &&
      referencedOwners.size > 0
    ) {
      for (
        const siteId
        of referencedOwners
      ) {
        const site =
          siteById.get(
            siteId,
          );

        if (!site) {
          continue;
        }

        copies.push({
          name,
          siteId,
          siteKey:
            site.key,
          sourceKey:
            uploadsStoragePath(
              name,
            ),
          targetKey:
            tenantUploadsStoragePath(
              siteId,
              name,
            ),
          reason:
            "referenced",
        });
      }

      continue;
    }

    if (claimSite) {
      copies.push({
        name,
        siteId:
          claimSite.id,
        siteKey:
          claimSite.key,
        sourceKey:
          uploadsStoragePath(
            name,
          ),
        targetKey:
          tenantUploadsStoragePath(
            claimSite.id,
            name,
          ),
        reason:
          "explicit-unowned-claim",
      });

      continue;
    }

    unowned.push(
      name,
    );
  }

  console.log(
    "Staark B2.8 tenant media migration",
  );

  console.log(
    `Mode: ${options.write ? "WRITE" : "DRY RUN"}`,
  );

  console.log(
    `Sites: ${sites.length}`,
  );

  console.log(
    `Legacy media: ${legacyEntries.length}`,
  );

  console.log(
    `Planned tenant copies: ${copies.length}`,
  );

  console.log(
    `Unowned: ${unowned.length}`,
  );

  if (claimSite) {
    console.log(
      `Explicit unowned owner: ${claimSite.key} (${claimSite.id})`,
    );
  }

  console.log("");

  for (
    const copy
    of copies
  ) {
    console.log(
      `${copy.reason === "referenced" ? "REF" : "CLAIM"} ` +
      `${copy.name} -> ${copy.siteKey}`,
    );
  }

  if (
    unowned.length > 0
  ) {
    console.log("");
    console.log(
      "UNOWNED LEGACY FILES:",
    );

    for (
      const name
      of unowned
    ) {
      console.log(
        `  ! ${name}`,
      );
    }
  }

  if (!options.write) {
    console.log("");
    console.log(
      "Dry run complete. Zero storage writes.",
    );

    return;
  }

  if (
    unowned.length > 0
  ) {
    throw new Error(
      "Refusing WRITE while unowned media exists. " +
      "Review the dry-run and use --claim-unowned <site-key> only when ownership is known.",
    );
  }

  const createdKeys =
    new Set<string>();

  const metadataBySite =
    new Map<
      string,
      MediaMetadata
    >();

  for (
    const copy
    of copies
  ) {
    const sourceBytes =
      await storage.read(
        copy.sourceKey,
      );

    if (!sourceBytes) {
      throw new Error(
        `Legacy source disappeared: ${copy.sourceKey}`,
      );
    }

    const existing =
      await storage.read(
        copy.targetKey,
      );

    if (existing) {
      if (
        hashBytes(existing) !==
        hashBytes(sourceBytes)
      ) {
        throw new Error(
          `Target already exists with different content: ${copy.targetKey}`,
        );
      }
    } else {
      await storage.write(
        copy.targetKey,
        sourceBytes,
      );

      createdKeys.add(
        copy.targetKey,
      );
    }

    const sourceMeta =
      globalMetadata[
        copy.name
      ];

    if (sourceMeta) {
      const targetMeta =
        metadataBySite.get(
          copy.siteId,
        ) ?? {};

      targetMeta[
        copy.name
      ] = {
        ...sourceMeta,
      };

      metadataBySite.set(
        copy.siteId,
        targetMeta,
      );
    }
  }

  for (
    const [
      siteId,
      incoming,
    ]
    of metadataBySite
  ) {
    const key =
      tenantStateStoragePath(
        siteId,
        "media.json",
      );

    const existing =
      (
        await readStorageJson<MediaMetadata>(
          storage,
          key,
        )
      ) ?? {};

    const merged = {
      ...existing,
      ...incoming,
    };

    const existed =
      await storage.exists(
        key,
      );

    await writeStorageJson(
      storage,
      key,
      merged,
    );

    if (!existed) {
      createdKeys.add(
        key,
      );
    }
  }

  const manifest: Manifest = {
    version:
      1,

    createdAt:
      new Date()
        .toISOString(),

    legacyUploadsPrefix:
      legacyRoot,

    legacyMetadataKey:
      globalMetadataKey,

    createdKeys:
      [
        ...createdKeys,
      ].sort(),

    copies,

    unowned,
  };

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-",
      );

  const manifestKey =
    stateStoragePath(
      "migrations",
      `media-tenant-scope-v1-${timestamp}.json`,
    );

  await writeStorageJson(
    storage,
    manifestKey,
    manifest,
  );

  console.log("");
  console.log(
    `Migration completed.`,
  );

  console.log(
    `Manifest: ${manifestKey}`,
  );

  console.log(
    `Created tenant keys: ${createdKeys.size}`,
  );

  console.log("");
  console.log(
    "Legacy public/uploads and legacy .staark/media.json were NOT deleted.",
  );

  console.log(
    "Rollback is therefore lossless: delete tenant keys listed in the manifest.",
  );
}

main()
  .catch(
    (error) => {
      console.error(
        error instanceof Error
          ? error.message
          : error,
      );

      process.exitCode = 1;
    },
  )
  .finally(
    async () => {
      await disconnectPrismaClient();
    },
  );
