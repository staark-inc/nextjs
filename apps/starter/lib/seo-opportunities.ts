import type {
  SeoAuditResult,
  SeoAuditTone,
} from "./seo-audit";

export type SeoOpportunityPriority =
  | "high"
  | "medium"
  | "low";

export type SeoOpportunity = {
  id: string;
  pageId: string;
  path: string;
  pageTitle: string;
  checkKey: string;
  title: string;
  description: string;
  priority: SeoOpportunityPriority;
};

export type SeoOpportunitySummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
};

export type SeoOpportunitiesResult = {
  score: number;
  pages: number;
  optimizedPages: number;
  needsWorkPages: number;
  poorPages: number;
  noindexPages: number;
  summary: SeoOpportunitySummary;
  opportunities: SeoOpportunity[];
};

type AuditedPage = {
  pageId: string;
  path: string;
  title: string;
  noindex: boolean;
  audit: SeoAuditResult;
};

function priorityForTone(
  tone: SeoAuditTone,
): SeoOpportunityPriority {
  if (tone === "error") {
    return "high";
  }

  if (tone === "warning") {
    return "medium";
  }

  return "low";
}

function priorityWeight(
  priority: SeoOpportunityPriority,
): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

export function buildSeoOpportunities(
  pages: AuditedPage[],
): SeoOpportunitiesResult {
  const indexable =
    pages.filter(
      (page) => !page.noindex,
    );

  const opportunities: SeoOpportunity[] = [];

  for (const page of indexable) {
    for (const check of page.audit.checks) {
      if (check.passed) {
        continue;
      }

      // Avoid duplicate opportunities:
      // if the field itself is missing, don't also report its length.
      if (
        check.key === "title-length" &&
        page.audit.checks.some(
          (item) =>
            item.key === "title-present" &&
            !item.passed,
        )
      ) {
        continue;
      }

      if (
        check.key === "description-length" &&
        page.audit.checks.some(
          (item) =>
            item.key === "description-present" &&
            !item.passed,
        )
      ) {
        continue;
      }

      const priority =
        priorityForTone(
          check.tone,
        );

      opportunities.push({
        id:
          `${page.pageId}:${check.key}`,

        pageId:
          page.pageId,

        path:
          page.path,

        pageTitle:
          page.title,

        checkKey:
          check.key,

        title:
          check.label,

        description:
          check.message,

        priority,
      });
    }
  }

  opportunities.sort(
    (a, b) =>
      priorityWeight(b.priority) -
        priorityWeight(a.priority) ||
      a.path.localeCompare(b.path) ||
      a.title.localeCompare(b.title),
  );

  const score =
    indexable.length > 0
      ? Math.round(
          indexable.reduce(
            (sum, page) =>
              sum +
              page.audit.score,
            0,
          ) /
            indexable.length,
        )
      : 0;

  return {
    score,

    pages:
      pages.length,

    optimizedPages:
      indexable.filter(
        (page) =>
          page.audit.status ===
          "good",
      ).length,

    needsWorkPages:
      indexable.filter(
        (page) =>
          page.audit.status ===
          "needs-work",
      ).length,

    poorPages:
      indexable.filter(
        (page) =>
          page.audit.status ===
          "poor",
      ).length,

    noindexPages:
      pages.filter(
        (page) =>
          page.noindex,
      ).length,

    summary: {
      total:
        opportunities.length,

      high:
        opportunities.filter(
          (item) =>
            item.priority === "high",
        ).length,

      medium:
        opportunities.filter(
          (item) =>
            item.priority ===
            "medium",
        ).length,

      low:
        opportunities.filter(
          (item) =>
            item.priority === "low",
        ).length,
    },

    opportunities,
  };
}
