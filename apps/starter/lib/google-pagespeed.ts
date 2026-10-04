const API_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PageSpeedStrategy =
  | "mobile"
  | "desktop";

export type PageSpeedCategoryScores = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

export type PageSpeedMetrics = {
  fcpMs: number | null;
  lcpMs: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
  cls: number | null;
};

export type PageSpeedOpportunity = {
  id: string;
  title: string;
  description: string | null;
  score: number | null;
  displayValue: string | null;
  savingsMs: number | null;
};

export type PageSpeedResult = {
  url: string;
  finalUrl: string | null;
  strategy: PageSpeedStrategy;
  fetchedAt: string | null;

  categories:
    PageSpeedCategoryScores;

  metrics:
    PageSpeedMetrics;

  opportunities:
    PageSpeedOpportunity[];
};

type Audit = {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: {
    type?: string;
    overallSavingsMs?: number;
  };
};

type Category = {
  score?: number | null;
};

type ApiResponse = {
  id?: string;

  lighthouseResult?: {
    finalUrl?: string;
    fetchTime?: string;

    categories?: {
      performance?: Category;
      accessibility?: Category;
      "best-practices"?: Category;
      seo?: Category;
    };

    audits?: Record<
      string,
      Audit
    >;
  };

  error?: {
    message?: string;
  };
};

type CacheEntry = {
  expiresAt: number;
  value: PageSpeedResult;
};

const globalForPageSpeed =
  globalThis as typeof globalThis & {
    __staarkPageSpeedCache?:
      Map<string, CacheEntry>;
  };

function cache():
Map<string, CacheEntry> {
  if (
    !globalForPageSpeed
      .__staarkPageSpeedCache
  ) {
    globalForPageSpeed
      .__staarkPageSpeedCache =
      new Map();
  }

  return globalForPageSpeed
    .__staarkPageSpeedCache;
}

const CACHE_MS =
  10 * 60 * 1000;

function categoryScore(
  category:
    | Category
    | undefined,
): number | null {
  if (
    typeof category?.score !==
    "number"
  ) {
    return null;
  }

  return Math.round(
    category.score * 100,
  );
}

function numericAudit(
  audits:
    | Record<string, Audit>
    | undefined,
  id: string,
): number | null {
  const value =
    audits?.[id]?.numericValue;

  return typeof value ===
    "number"
    ? value
    : null;
}

export function pageSpeedServiceSummary(
  env: NodeJS.ProcessEnv =
    process.env,
) {
  return {
    configured:
      Boolean(
        env.GOOGLE_PAGESPEED_API_KEY
          ?.trim(),
      ),
  };
}

export async function runPageSpeed(
  input: {
    url: string;
    strategy: PageSpeedStrategy;
  },
): Promise<PageSpeedResult> {
  const key =
    process.env
      .GOOGLE_PAGESPEED_API_KEY
      ?.trim();

  const cacheKey =
    `${input.strategy}:${input.url}`;

  const cached =
    cache().get(
      cacheKey,
    );

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.value;
  }

  const params =
    new URLSearchParams({
      url:
        input.url,

      strategy:
        input.strategy,

      locale:
        "en",
    });

  for (const category of [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ]) {
    params.append(
      "category",
      category,
    );
  }

  if (key) {
    params.set(
      "key",
      key,
    );
  }

  const response =
    await fetch(
      `${API_URL}?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            45_000,
          ),
      },
    );

  const raw =
    await response
      .json()
      .catch(() => null) as
      ApiResponse | null;

  if (
    !response.ok ||
    !raw?.lighthouseResult
  ) {
    throw new Error(
      raw?.error?.message ||
        `PageSpeed Insights returned HTTP ${response.status}.`,
    );
  }

  const lighthouse =
    raw.lighthouseResult;

  const audits =
    lighthouse.audits ?? {};

  const opportunities =
    Object.entries(audits)
      .filter(([, audit]) => {
        return (
          audit.details?.type ===
            "opportunity" &&
          typeof audit.score ===
            "number" &&
          audit.score < 0.9
        );
      })
      .map(
        ([id, audit]) => ({
          id,

          title:
            audit.title ?? id,

          description:
            audit.description ??
            null,

          score:
            typeof audit.score ===
            "number"
              ? audit.score
              : null,

          displayValue:
            audit.displayValue ??
            null,

          savingsMs:
            typeof audit.details
              ?.overallSavingsMs ===
              "number"
              ? audit.details
                  .overallSavingsMs
              : null,
        }),
      )
      .sort(
        (a, b) =>
          (b.savingsMs ?? 0) -
          (a.savingsMs ?? 0),
      )
      .slice(0, 10);

  const result: PageSpeedResult = {
    url:
      input.url,

    finalUrl:
      lighthouse.finalUrl ??
      raw.id ??
      null,

    strategy:
      input.strategy,

    fetchedAt:
      lighthouse.fetchTime ??
      null,

    categories: {
      performance:
        categoryScore(
          lighthouse.categories
            ?.performance,
        ),

      accessibility:
        categoryScore(
          lighthouse.categories
            ?.accessibility,
        ),

      bestPractices:
        categoryScore(
          lighthouse.categories?.[
            "best-practices"
          ],
        ),

      seo:
        categoryScore(
          lighthouse.categories
            ?.seo,
        ),
    },

    metrics: {
      fcpMs:
        numericAudit(
          audits,
          "first-contentful-paint",
        ),

      lcpMs:
        numericAudit(
          audits,
          "largest-contentful-paint",
        ),

      tbtMs:
        numericAudit(
          audits,
          "total-blocking-time",
        ),

      speedIndexMs:
        numericAudit(
          audits,
          "speed-index",
        ),

      cls:
        numericAudit(
          audits,
          "cumulative-layout-shift",
        ),
    },

    opportunities,
  };

  cache().set(
    cacheKey,
    {
      value:
        result,

      expiresAt:
        Date.now() +
        CACHE_MS,
    },
  );

  return result;
}
