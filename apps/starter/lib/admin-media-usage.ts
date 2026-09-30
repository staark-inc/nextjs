import path from "node:path";
import { resolvePublicContentConfig } from "./content-source";
import { createPostgresRepositories } from "./repositories";
import {
  contentStoragePath,
  listContent,
  readContentJson,
} from "./storage";

export type MediaUsageReference = {
  source: string;
  label: string;
  field: string;
  href?: string;
};

export type MediaUsageIndex = Record<string, MediaUsageReference[]>;

function sourceInfo(
  relative: string,
  document: Record<string, unknown>,
): { label: string; href?: string } {
  const normalized = relative.replaceAll("\\", "/");

  if (normalized === "site.json") {
    const name = typeof document.name === "string" ? document.name : "Site";
    return { label: `Site settings · ${name}`, href: "/admin/site" };
  }

  if (normalized.startsWith("pages/") && normalized.endsWith(".json")) {
    const file = path.posix.basename(normalized);
    const title =
      typeof document.title === "string"
        ? document.title
        : file.replace(/\.json$/i, "");
    return {
      label: title,
      href: `/admin/pages/${encodeURIComponent(file)}`,
    };
  }

  return { label: normalized };
}

function fieldName(parts: Array<string | number>): string {
  if (!parts.length) return "document";
  return parts
    .map((part, index) =>
      typeof part === "number"
        ? `[${part}]`
        : `${index > 0 ? "." : ""}${part}`,
    )
    .join("");
}

function scanValue(
  value: unknown,
  parts: Array<string | number>,
  reference: Omit<MediaUsageReference, "field">,
  index: MediaUsageIndex,
  seen: Set<string>,
): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\/uploads\/([a-zA-Z0-9._-]+)/g)) {
      const name = match[1];
      if (!name) continue;

      const field = fieldName(parts);
      const key = `${name}\0${reference.source}\0${field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (index[name] ??= []).push({ ...reference, field });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, itemIndex) =>
      scanValue(item, [...parts, itemIndex], reference, index, seen),
    );
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      scanValue(nested, [...parts, key], reference, index, seen);
    }
  }
}

export async function buildMediaUsageIndex(): Promise<MediaUsageIndex> {
  const index: MediaUsageIndex = {};
  const seen = new Set<string>();
  const config = resolvePublicContentConfig();

  if (config.source === "postgres") {
    const repositories = createPostgresRepositories();
    const site = await repositories.sites.findByKey(config.siteKey);

    if (!site) {
      throw new Error(
        `No PostgreSQL Site exists for STAARK_SITE_KEY="${config.siteKey}".`,
      );
    }

    const pages = await repositories.pages.list(site.id);

    const documents: Array<{
      source: string;
      label: string;
      href: string;
      document: Record<string, unknown>;
    }> = [
      {
        source: "site",
        label: `Site settings · ${site.settings.name}`,
        href: "/admin/site",
        document: site.settings as unknown as Record<string, unknown>,
      },
      ...pages.map((record) => ({
        source: `page:${record.id}`,
        label: record.page.title,
        href: `/admin/pages/${encodeURIComponent(record.id)}`,
        document: record.page as unknown as Record<string, unknown>,
      })),
    ];

    for (const item of documents) {
      scanValue(
        item.document,
        [],
        {
          source: item.source,
          label: item.label,
          href: item.href,
        },
        index,
        seen,
      );
    }
  } else {
    const root = contentStoragePath();
    const prefix = `${root}/`;

    const files = (await listContent(""))
      .map((entry) =>
        entry.path.startsWith(prefix)
          ? entry.path.slice(prefix.length)
          : "",
      )
      .filter(
        (relative) =>
          Boolean(relative) &&
          relative.endsWith(".json"),
      )
      .sort();

    for (const source of files) {
      try {
        const document =
          await readContentJson<Record<string, unknown>>(source);

        if (!document) continue;

        const info = sourceInfo(source, document);

        scanValue(
          document,
          [],
          {
            source,
            label: info.label,
            ...(info.href ? { href: info.href } : {}),
          },
          index,
          seen,
        );
      } catch {
        // A malformed content object should not make the media library unusable.
      }
    }
  }

  for (const references of Object.values(index)) {
    references.sort((a, b) =>
      `${a.source}:${a.field}`.localeCompare(
        `${b.source}:${b.field}`,
      ),
    );
  }

  return index;
}

export async function findMediaUsage(name: string): Promise<MediaUsageReference[]> {
  const index = await buildMediaUsageIndex();
  return index[name] ?? [];
}
