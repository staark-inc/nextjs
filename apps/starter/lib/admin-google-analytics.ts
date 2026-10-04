import {
  runGoogleAnalyticsReport,
  type GaRunReportResponse,
} from "./google-analytics-data";

import {
  readGoogleAnalyticsBinding,
} from "./google-analytics-binding";

export type GoogleAnalyticsMetricSummary = {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  engagementRate: number;
};

export type GoogleAnalyticsBreakdownRow = {
  label: string;
  value: number;
};

export type GoogleAnalyticsLandingPage = {
  path: string;
  sessions: number;
  activeUsers: number;
};

export type AdminGoogleAnalyticsData = {
  configured: boolean;
  connected: boolean;
  propertyId: string | null;
  days: number;
  error: string | null;

  metrics:
    GoogleAnalyticsMetricSummary;

  sources:
    GoogleAnalyticsBreakdownRow[];

  devices:
    GoogleAnalyticsBreakdownRow[];

  landingPages:
    GoogleAnalyticsLandingPage[];
};

function numberValue(
  value: string | undefined,
): number {
  const parsed =
    Number(value ?? "0");

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function daysForLevel(
  level: string | null,
): number {
  if (level === "advanced") {
    return 365;
  }

  if (level === "full") {
    return 90;
  }

  return 30;
}

function empty(
  propertyId: string | null,
  days: number,
  error: string | null = null,
): AdminGoogleAnalyticsData {
  return {
    configured:
      Boolean(propertyId),

    connected: false,
    propertyId,
    days,
    error,

    metrics: {
      activeUsers: 0,
      sessions: 0,
      pageViews: 0,
      engagementRate: 0,
    },

    sources: [],
    devices: [],
    landingPages: [],
  };
}

export async function readAdminGoogleAnalytics(
  siteId: string,
  level: string | null,
): Promise<AdminGoogleAnalyticsData> {
  const settings =
    await readGoogleAnalyticsBinding(
      siteId,
    );

  const days =
    daysForLevel(level);

  const propertyId =
    settings.propertyId ?? null;

  if (
    !settings.enabled ||
    !propertyId
  ) {
    return empty(
      propertyId,
      days,
    );
  }

  const dateRanges = [
    {
      startDate:
        `${days - 1}daysAgo`,

      endDate: "today",
    },
  ];

  try {
    const [
      summary,
      sources,
      devices,
      landingPages,
    ] = await Promise.all([
      runGoogleAnalyticsReport(
        propertyId,
        {
          dateRanges,

          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            {
              name:
                "screenPageViews",
            },
            {
              name:
                "engagementRate",
            },
          ],
        },
      ),

      level === "overview"
        ? Promise.resolve<GaRunReportResponse>({})
        : runGoogleAnalyticsReport(
            propertyId,
            {
              dateRanges,

              dimensions: [
                {
                  name:
                    "sessionDefaultChannelGroup",
                },
              ],

              metrics: [
                {
                  name: "sessions",
                },
              ],

              limit: "8",

              orderBys: [
                {
                  metric: {
                    metricName:
                      "sessions",
                  },

                  desc: true,
                },
              ],
            },
          ),

      level === "overview"
        ? Promise.resolve<GaRunReportResponse>({})
        : runGoogleAnalyticsReport(
            propertyId,
            {
              dateRanges,

              dimensions: [
                {
                  name:
                    "deviceCategory",
                },
              ],

              metrics: [
                {
                  name: "sessions",
                },
              ],

              limit: "10",

              orderBys: [
                {
                  metric: {
                    metricName:
                      "sessions",
                  },

                  desc: true,
                },
              ],
            },
          ),

      level === "overview"
        ? Promise.resolve<GaRunReportResponse>({})
        : runGoogleAnalyticsReport(
            propertyId,
            {
              dateRanges,

              dimensions: [
                {
                  name:
                    "landingPagePlusQueryString",
                },
              ],

              metrics: [
                {
                  name: "sessions",
                },
                {
                  name:
                    "activeUsers",
                },
              ],

              limit:
                level === "advanced"
                  ? "20"
                  : "10",

              orderBys: [
                {
                  metric: {
                    metricName:
                      "sessions",
                  },

                  desc: true,
                },
              ],
            },
          ),
    ]);

    const metricRow =
      summary.rows?.[0];

    return {
      configured: true,
      connected: true,
      propertyId,
      days,
      error: null,

      metrics: {
        activeUsers:
          numberValue(
            metricRow
              ?.metricValues?.[0]
              ?.value,
          ),

        sessions:
          numberValue(
            metricRow
              ?.metricValues?.[1]
              ?.value,
          ),

        pageViews:
          numberValue(
            metricRow
              ?.metricValues?.[2]
              ?.value,
          ),

        engagementRate:
          numberValue(
            metricRow
              ?.metricValues?.[3]
              ?.value,
          ),
      },

      sources:
        (sources.rows ?? [])
          .map((row) => ({
            label:
              row
                .dimensionValues?.[0]
                ?.value ||
              "Unknown",

            value:
              numberValue(
                row
                  .metricValues?.[0]
                  ?.value,
              ),
          })),

      devices:
        (devices.rows ?? [])
          .map((row) => ({
            label:
              row
                .dimensionValues?.[0]
                ?.value ||
              "Unknown",

            value:
              numberValue(
                row
                  .metricValues?.[0]
                  ?.value,
              ),
          })),

      landingPages:
        (landingPages.rows ?? [])
          .map((row) => ({
            path:
              row
                .dimensionValues?.[0]
                ?.value ||
              "/",

            sessions:
              numberValue(
                row
                  .metricValues?.[0]
                  ?.value,
              ),

            activeUsers:
              numberValue(
                row
                  .metricValues?.[1]
                  ?.value,
              ),
          })),
    };
  } catch (error) {
    return empty(
      propertyId,
      days,

      error instanceof Error
        ? error.message
        : "Google Analytics data could not be loaded.",
    );
  }
}
