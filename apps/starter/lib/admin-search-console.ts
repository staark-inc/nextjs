import {
  querySearchConsole,
} from "./google-search-console-data";
import {
  readSearchConsoleBinding,
} from "./search-console-binding";

export type SearchConsoleMetricSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleItem = {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type AdminSearchConsoleData = {
  configured: boolean;
  connected: boolean;
  siteUrl: string | null;
  days: number;
  error: string | null;
  metrics: SearchConsoleMetricSummary;
  queries: SearchConsoleItem[];
  pages: SearchConsoleItem[];
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysForLevel(level: string | null): number {
  if (level === "advanced") return 365;
  if (level === "full") return 90;
  return 28;
}

function empty(
  siteUrl: string | null,
  days: number,
  error: string | null = null,
): AdminSearchConsoleData {
  return {
    configured: Boolean(siteUrl),
    connected: false,
    siteUrl,
    days,
    error,
    metrics: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    },
    queries: [],
    pages: [],
  };
}

function item(
  row: {
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  },
): SearchConsoleItem {
  return {
    label: row.keys?.[0] || "Unknown",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

export async function readAdminSearchConsole(
  siteId: string,
  level: string | null,
): Promise<AdminSearchConsoleData> {
  const binding =
    await readSearchConsoleBinding(siteId);

  const days = daysForLevel(level);
  const siteUrl = binding.siteUrl;

  if (!binding.enabled || !siteUrl) {
    return empty(siteUrl, days);
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(
    start.getUTCDate() - (days - 1),
  );

  const range = {
    startDate: isoDate(start),
    endDate: isoDate(end),
  };

  try {
    const [summary, queries, pages] =
      await Promise.all([
        querySearchConsole(siteUrl, {
          ...range,
          rowLimit: 1,
        }),

        querySearchConsole(siteUrl, {
          ...range,
          dimensions: ["query"],
          rowLimit:
            level === "overview" ? 10 : 25,
        }),

        querySearchConsole(siteUrl, {
          ...range,
          dimensions: ["page"],
          rowLimit:
            level === "overview" ? 10 : 25,
        }),
      ]);

    const total = summary.rows?.[0];

    return {
      configured: true,
      connected: true,
      siteUrl,
      days,
      error: null,
      metrics: {
        clicks: total?.clicks ?? 0,
        impressions: total?.impressions ?? 0,
        ctr: total?.ctr ?? 0,
        position: total?.position ?? 0,
      },
      queries:
        (queries.rows ?? []).map(item),
      pages:
        (pages.rows ?? []).map(item),
    };
  } catch (error) {
    return empty(
      siteUrl,
      days,
      error instanceof Error
        ? error.message
        : "Search Console data could not be loaded.",
    );
  }
}
