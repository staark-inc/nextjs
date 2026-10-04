import {
  getPlanFeatureAccess,
  type FeatureAccess,
} from "./feature-access";
import { getPrismaClient } from "./db/prisma";
import { requireAdminTenantContext } from "./admin-tenant";
import { resolvePublicContentConfig } from "./content-source";

export type AnalyticsDay = {
  date: string;
  pageViews: number;
};

export type AnalyticsPage = {
  path: string;
  pageViews: number;
};

export type AdminAnalytics = {
  access: FeatureAccess;
  days: number;

  totalPageViews: number;
  previousPageViews: number;
  pageViewsChangePercent: number | null;

  activeDays: number;
  trackedPages: number;
  averagePerDay: number;

  daily: AnalyticsDay[];
  topPages: AnalyticsPage[];
};

function historyDays(level: string | null): number {
  if (level === "advanced") return 365;
  if (level === "full") return 90;
  return 30;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function readAdminAnalytics(): Promise<AdminAnalytics> {
  const contentConfig =
    resolvePublicContentConfig();

  if (
    contentConfig.source !==
    "postgres"
  ) {
    const days = 30;

    return {
      access: {
        feature: "analytics",
        enabled: true,
        level: "overview",
        entitlementKey: "analytics",
      },

      days,
      totalPageViews: 0,
      previousPageViews: 0,
      pageViewsChangePercent: null,
      activeDays: 0,
      trackedPages: 0,
      averagePerDay: 0,

      daily: Array.from(
        { length: days },
        (_, index) => {
          const date = new Date();

          date.setUTCHours(
            0,
            0,
            0,
            0,
          );

          date.setUTCDate(
            date.getUTCDate() -
              (days - index - 1),
          );

          return {
            date:
              date
                .toISOString()
                .slice(0, 10),

            pageViews: 0,
          };
        },
      ),

      topPages: [],
    };
  }

  const tenant = await requireAdminTenantContext();

  const access = getPlanFeatureAccess(
    tenant.entitlements,
    "analytics",
  );

  if (!access.enabled) {
    throw new Error(
      "Analytics is not included in the current plan.",
    );
  }

  const days = historyDays(access.level);

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (days - 1));

  const previousFrom = new Date(from);
  previousFrom.setUTCDate(
    previousFrom.getUTCDate() - days,
  );

  const rows =
    await getPrismaClient().analyticsDaily.findMany({
      where: {
        siteId: tenant.siteId,
        date: {
          gte: previousFrom,
        },
      },
      orderBy: [
        { date: "asc" },
        { pageViews: "desc" },
      ],
    });

  const byDay = new Map<string, number>();
  const byPage = new Map<string, number>();

  let previousPageViews = 0;

  for (const row of rows) {
    if (row.date < from) {
      previousPageViews +=
        row.pageViews;

      continue;
    }

    const date = dateKey(row.date);

    byDay.set(
      date,
      (byDay.get(date) ?? 0) +
        row.pageViews,
    );

    byPage.set(
      row.path,
      (byPage.get(row.path) ?? 0) +
        row.pageViews,
    );
  }

  const daily: AnalyticsDay[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(from);
    date.setUTCDate(
      from.getUTCDate() + offset,
    );

    const key = dateKey(date);

    daily.push({
      date: key,
      pageViews: byDay.get(key) ?? 0,
    });
  }

  const totalPageViews = daily.reduce(
    (sum, item) => sum + item.pageViews,
    0,
  );

  const activeDays = daily.filter(
    (item) => item.pageViews > 0,
  ).length;

  const pageViewsChangePercent =
    previousPageViews > 0
      ? (
          (totalPageViews -
            previousPageViews) /
          previousPageViews
        ) * 100
      : totalPageViews > 0
        ? null
        : 0;

  const topPages = [...byPage.entries()]
    .map(([path, pageViews]) => ({
      path,
      pageViews,
    }))
    .sort(
      (a, b) =>
        b.pageViews - a.pageViews ||
        a.path.localeCompare(b.path),
    )
    .slice(0, access.level === "overview" ? 5 : 20);

  return {
    access,
    days,
    totalPageViews,
    previousPageViews,
    pageViewsChangePercent,
    activeDays,
    trackedPages: byPage.size,
    averagePerDay:
      days > 0
        ? totalPageViews / days
        : 0,
    daily,
    topPages,
  };
}
