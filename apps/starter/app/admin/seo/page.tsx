"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./seo.module.css";

type SeoAuditCheck = {
  key: string;
  label: string;
  passed: boolean;
  tone:
    | "good"
    | "warning"
    | "error"
    | "info";
  message: string;
  points: number;
  maxPoints: number;
};

type PageSeo = {
  file: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  noindex: boolean;
  updatedAt?: string;
  hasOg: boolean;
  published?: boolean;

  audit: {
    score: number;
    status:
      | "good"
      | "needs-work"
      | "poor"
      | "noindex";
    checks: SeoAuditCheck[];
    internalLinks: number;
    images: number;
    imagesWithAlt: number;
  };
};

type SiteSeo = {
  titleTemplate: string;
  defaultDescription: string;
  ogImage: string;
  businessType: string;
};

type SeoDraft = {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
};

type OpportunityPriority =
  | "high"
  | "medium"
  | "low";

type SeoOpportunity = {
  id: string;
  pageId: string;
  path: string;
  pageTitle: string;
  checkKey: string;
  title: string;
  description: string;
  priority: OpportunityPriority;
};

type SeoOpportunities = {
  score: number;
  pages: number;
  optimizedPages: number;
  needsWorkPages: number;
  poorPages: number;
  noindexPages: number;

  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };

  opportunities: SeoOpportunity[];
};

type PageSpeedStrategy =
  | "mobile"
  | "desktop";

type PageSpeedResult = {
  url: string;
  finalUrl: string | null;
  strategy: PageSpeedStrategy;
  fetchedAt: string | null;

  categories: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };

  metrics: {
    fcpMs: number | null;
    lcpMs: number | null;
    tbtMs: number | null;
    speedIndexMs: number | null;
    cls: number | null;
  };

  opportunities: Array<{
    id: string;
    title: string;
    description: string | null;
    score: number | null;
    displayValue: string | null;
    savingsMs: number | null;
  }>;
};

type PageSpeedResponse = {
  service?: {
    configured: boolean;
  };

  plan?: {
    level: string | null;
  };

  result?: PageSpeedResult;
  error?: string;
  code?: string;
};

function scoreTone(
  score: number,
): string {
  if (score >= 85) {
    return styles.good ?? "";
  }

  if (score >= 60) {
    return styles.warning ?? "";
  }

  return styles.poor ?? "";
}

function scoreLabel(
  status: PageSeo["audit"]["status"],
): string {
  if (status === "good") {
    return "Good";
  }

  if (status === "needs-work") {
    return "Needs work";
  }

  if (status === "noindex") {
    return "Noindex";
  }

  return "Poor";
}

function metricMs(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${Math.round(value)}ms`;
}

function metricCls(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toFixed(3);
}

function priorityLabel(
  priority: OpportunityPriority,
): string {
  if (priority === "high") {
    return "High";
  }

  if (priority === "medium") {
    return "Medium";
  }

  return "Low";
}

export default function SeoPage() {
  const [
    pages,
    setPages,
  ] = useState<PageSeo[]>([]);

  const [
    opportunities,
    setOpportunities,
  ] = useState<SeoOpportunities | null>(
    null,
  );

  const [
    siteSeo,
    setSiteSeo,
  ] = useState<SiteSeo>({
    titleTemplate: "",
    defaultDescription: "",
    ogImage: "",
    businessType: "",
  });

  const [
    siteData,
    setSiteData,
  ] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    savingPage,
    setSavingPage,
  ] = useState(false);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("all");

  const [
    selected,
    setSelected,
  ] = useState("");

  const [
    draft,
    setDraft,
  ] = useState<SeoDraft | null>(
    null,
  );

  const [
    pageSpeedStrategy,
    setPageSpeedStrategy,
  ] =
    useState<PageSpeedStrategy>(
      "mobile",
    );

  const [
    pageSpeed,
    setPageSpeed,
  ] =
    useState<PageSpeedResult | null>(
      null,
    );

  const [
    pageSpeedLoading,
    setPageSpeedLoading,
  ] = useState(false);

  const [
    pageSpeedError,
    setPageSpeedError,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState<{
    msg: string;
    ok: boolean;
  } | null>(null);

  function showToast(
    msg: string,
    ok: boolean,
  ) {
    setToast({
      msg,
      ok,
    });

    window.setTimeout(
      () =>
        setToast(null),
      3000,
    );
  }

  async function load() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        siteRes,
        pagesRes,
        opportunitiesRes,
      ] =
        await Promise.all([
          fetch(
            "/api/admin/site",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/admin/seo/pages",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/admin/seo/opportunities",
            {
              cache: "no-store",
            },
          ),
        ]);

      if (
        !siteRes.ok ||
        !pagesRes.ok
      ) {
        throw new Error(
          "SEO data could not be loaded.",
        );
      }

      const site =
        await siteRes.json();

      const pagesData =
        await pagesRes.json();

      const opportunityData =
        await opportunitiesRes
          .json()
          .catch(() => null);

      setSiteData(
        site,
      );

      setSiteSeo({
        titleTemplate:
          site.seo?.titleTemplate ??
          "",

        defaultDescription:
          site.seo
            ?.defaultDescription ??
          "",

        ogImage:
          site.seo?.ogImage ??
          "",

        businessType:
          site.seo?.businessType ??
          "",
      });

      const loadedPages =
        (pagesData.pages ??
          []) as PageSeo[];

      setPages(
        loadedPages,
      );

      if (
        opportunitiesRes.ok &&
        opportunityData
      ) {
        setOpportunities(
          opportunityData as SeoOpportunities,
        );
      } else {
        setOpportunities(
          null,
        );
      }

      setSelected(
        (current) => {
          if (
            current &&
            loadedPages.some(
              (page) =>
                page.file ===
                current,
            )
          ) {
            return current;
          }

          return (
            loadedPages[0]
              ?.file ?? ""
          );
        },
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "SEO data could not be loaded.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  useEffect(
    () => {
      void load();
    },
    [],
  );

  const selectedPage =
    useMemo(
      () =>
        pages.find(
          (page) =>
            page.file === selected,
        ) ?? null,
      [
        pages,
        selected,
      ],
    );

  useEffect(
    () => {
      if (!selectedPage) {
        setDraft(null);
        return;
      }

      setDraft({
        title:
          selectedPage.seoTitle,

        description:
          selectedPage
            .seoDescription,

        ogImage:
          selectedPage.ogImage,

        noindex:
          selectedPage.noindex,
      });

      setPageSpeed(null);
      setPageSpeedError("");
    },
    [
      selectedPage?.file,
    ],
  );

  async function saveSiteSeo() {
    if (!siteData) {
      return;
    }

    setSaving(
      true,
    );

    const updated = {
      ...siteData,

      seo: {
        ...(
          (siteData.seo as
            | object
            | undefined) ??
          {}
        ),

        ...siteSeo,
      },
    };

    try {
      const res =
        await fetch(
          "/api/admin/site",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                updated,
              ),
          },
        );

      if (!res.ok) {
        throw new Error(
          "Failed to save SEO settings.",
        );
      }

      setSiteData(
        updated,
      );

      showToast(
        "SEO settings saved.",
        true,
      );

      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save.",
        false,
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function selectPage(
    page: PageSeo,
    scroll = true,
  ) {
    setSelected(
      page.file,
    );

    if (scroll) {
      window.setTimeout(
        () =>
          document
            .getElementById(
              "seo-page-editor",
            )
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start",
            }),
        0,
      );
    }
  }

  function selectOpportunityPage(
    opportunity: SeoOpportunity,
  ) {
    const page =
      pages.find(
        (candidate) =>
          candidate.file ===
            opportunity.pageId ||
          candidate.path ===
            opportunity.path,
      );

    if (page) {
      selectPage(
        page,
      );
    }
  }

  async function savePageSeo() {
    if (
      !selected ||
      !draft
    ) {
      return;
    }

    setSavingPage(
      true,
    );

    try {
      const res =
        await fetch(
          "/api/admin/seo/pages",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                file:
                  selected,

                ...draft,
              }),
          },
        );

      const data =
        await res
          .json()
          .catch(
            () => ({}),
          );

      if (!res.ok) {
        throw new Error(
          (
            data as {
              error?: string;
            }
          ).error ??
            "Failed to save page SEO.",
        );
      }

      showToast(
        "SEO draft saved. Publish the page to update the live audit.",
        true,
      );

      /*
       * Reload instead of replacing the page with the PUT response.
       * The GET endpoint owns the live publication audit.
       */
      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save page SEO.",
        false,
      );
    } finally {
      setSavingPage(
        false,
      );
    }
  }

  async function runPageSpeed(
    strategy:
      PageSpeedStrategy =
        pageSpeedStrategy,
  ) {
    if (!selectedPage) {
      return;
    }

    setPageSpeedStrategy(
      strategy,
    );

    setPageSpeedLoading(
      true,
    );

    setPageSpeedError(
      "",
    );

    try {
      const params =
        new URLSearchParams({
          path:
            selectedPage.path,

          strategy,
        });

      const res =
        await fetch(
          `/api/admin/seo/pagespeed?${params.toString()}`,
          {
            cache:
              "no-store",
          },
        );

      const data =
        await res
          .json()
          .catch(
            () => ({}),
          ) as PageSpeedResponse;

      if (
        !res.ok ||
        !data.result
      ) {
        throw new Error(
          data.error ??
            "PageSpeed audit failed.",
        );
      }

      setPageSpeed(
        data.result,
      );
    } catch (error) {
      setPageSpeed(
        null,
      );

      setPageSpeedError(
        error instanceof Error
          ? error.message
          : "PageSpeed audit failed.",
      );
    } finally {
      setPageSpeedLoading(
        false,
      );
    }
  }

  const filteredPages =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLowerCase();

        return pages.filter(
          (page) => {
            const matchesQuery =
              !needle ||
              `${page.title} ${page.path} ${page.seoTitle}`
                .toLowerCase()
                .includes(
                  needle,
                );

            if (
              !matchesQuery
            ) {
              return false;
            }

            if (
              filter === "good"
            ) {
              return (
                page.audit
                  .status ===
                "good"
              );
            }

            if (
              filter === "needs"
            ) {
              return (
                page.audit
                  .status ===
                "needs-work"
              );
            }

            if (
              filter === "poor"
            ) {
              return (
                page.audit
                  .status ===
                "poor"
              );
            }

            if (
              filter ===
              "noindex"
            ) {
              return (
                page.audit
                  .status ===
                "noindex"
              );
            }

            return true;
          },
        );
      },
      [
        pages,
        query,
        filter,
      ],
    );

  const siteScore =
    opportunities?.score ??
    (
      pages.length
        ? Math.round(
            pages
              .filter(
                (page) =>
                  !page.noindex,
              )
              .reduce(
                (
                  sum,
                  page,
                ) =>
                  sum +
                  page.audit
                    .score,
                0,
              ) /
              Math.max(
                1,
                pages.filter(
                  (page) =>
                    !page.noindex,
                ).length,
              ),
          )
        : 0
    );

  if (loading) {
    return (
      <div className="sa-loading">
        Loading SEO control center…
      </div>
    );
  }

  if (loadError) {
    return (
      <section className="sa-card">
        <h2>
          SEO could not be loaded
        </h2>

        <p className="sa-note">
          {loadError}
        </p>

        <button
          type="button"
          className="sa-btn sa-btn--primary"
          onClick={() =>
            void load()
          }
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">
            Growth
          </span>

          <h1 className="sa-h1">
            SEO
          </h1>

          <p className="sa-subtitle">
            Search health, actionable opportunities
            and PageSpeed insights for your
            published website.
          </p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.fullBadge}>
            SEO Full
          </span>

          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={() =>
              void load()
            }
          >
            Refresh audit
          </button>
        </div>
      </section>

      <section className={styles.overviewGrid}>
        <article
          className={`${styles.scoreCard} ${scoreTone(
            siteScore,
          )}`}
        >
          <div>
            <span>
              Site SEO score
            </span>

            <strong>
              {siteScore}
            </strong>

            <small>
              / 100
            </small>
          </div>

          <p>
            Based on published,
            indexable pages.
          </p>
        </article>

        <article className={styles.metricCard}>
          <span>
            Published pages
          </span>

          <strong>
            {opportunities?.pages ??
              pages.length}
          </strong>

          <small>
            Audited live pages
          </small>
        </article>

        <article className={styles.metricCard}>
          <span>
            Optimized
          </span>

          <strong>
            {opportunities
              ?.optimizedPages ??
              pages.filter(
                (page) =>
                  page.audit
                    .status ===
                  "good",
              ).length}
          </strong>

          <small>
            Score 85+
          </small>
        </article>

        <article className={styles.metricCard}>
          <span>
            Opportunities
          </span>

          <strong>
            {opportunities
              ?.summary.total ??
              0}
          </strong>

          <small>
            Actionable improvements
          </small>
        </article>
      </section>

      <section className="sa-card">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">
              SEO Opportunities
            </p>

            <h2>
              What to improve next
            </h2>

            <p>
              Prioritized from the SEO audit of
              the currently published website.
            </p>
          </div>

          {opportunities ? (
            <div className={styles.prioritySummary}>
              <span className={styles.high}>
                {opportunities.summary.high} High
              </span>

              <span className={styles.medium}>
                {opportunities.summary.medium} Medium
              </span>

              <span className={styles.low}>
                {opportunities.summary.low} Low
              </span>
            </div>
          ) : null}
        </div>

        {opportunities?.opportunities.length ? (
          <div className={styles.opportunityList}>
            {opportunities.opportunities.map(
              (item) => (
                <article
                  key={item.id}
                  className={styles.opportunityRow}
                >
                  <span
                    className={`${styles.priority} ${
                      styles[
                        `priority${priorityLabel(
                          item.priority,
                        )}`
                      ]
                    }`}
                  >
                    {priorityLabel(
                      item.priority,
                    )}
                  </span>

                  <div className={styles.opportunityCopy}>
                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {item.pageTitle} · {item.path}
                    </span>

                    <small>
                      {item.description}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    onClick={() =>
                      selectOpportunityPage(
                        item,
                      )
                    }
                  >
                    Fix
                  </button>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">
              No SEO opportunities found
            </div>

            <div className="sa-empty__desc">
              Published pages currently pass the
              available audit checks.
            </div>
          </div>
        )}
      </section>

      <section className="sa-card">
        <div className="sa-card__header sa-card__header--row">
          <div>
            <p className="sa-card__eyebrow">
              PageSpeed Insights
            </p>

            <h2>
              Performance & technical quality
            </h2>

            <p>
              Run Google Lighthouse against a
              published page. Results are cached
              server-side to protect API quota.
            </p>
          </div>

          <div className={styles.pageSpeedControls}>
            <select
              value={
                selectedPage?.file ??
                ""
              }
              onChange={(event) => {
                const page =
                  pages.find(
                    (candidate) =>
                      candidate.file ===
                      event.target.value,
                  );

                if (page) {
                  selectPage(
                    page,
                    false,
                  );
                }
              }}
            >
              {pages.map(
                (page) => (
                  <option
                    key={page.file}
                    value={page.file}
                  >
                    {page.title} · {page.path}
                  </option>
                ),
              )}
            </select>

            <div className="sa-tab-bar">
              <button
                type="button"
                className={`sa-tab ${
                  pageSpeedStrategy ===
                  "mobile"
                    ? "sa-tab--active"
                    : ""
                }`}
                onClick={() =>
                  void runPageSpeed(
                    "mobile",
                  )
                }
                disabled={
                  pageSpeedLoading
                }
              >
                Mobile
              </button>

              <button
                type="button"
                className={`sa-tab ${
                  pageSpeedStrategy ===
                  "desktop"
                    ? "sa-tab--active"
                    : ""
                }`}
                onClick={() =>
                  void runPageSpeed(
                    "desktop",
                  )
                }
                disabled={
                  pageSpeedLoading
                }
              >
                Desktop
              </button>
            </div>

            <button
              type="button"
              className="sa-btn sa-btn--primary"
              onClick={() =>
                void runPageSpeed()
              }
              disabled={
                pageSpeedLoading ||
                !selectedPage
              }
            >
              {pageSpeedLoading
                ? "Analyzing…"
                : "Run audit"}
            </button>
          </div>
        </div>

        {pageSpeedError ? (
          <div className={styles.errorBox}>
            {pageSpeedError}
          </div>
        ) : null}

        {!pageSpeed &&
        !pageSpeedLoading &&
        !pageSpeedError ? (
          <div className={styles.pageSpeedEmpty}>
            <strong>
              Select a page and run an audit
            </strong>

            <span>
              Mobile and desktop are measured
              independently.
            </span>
          </div>
        ) : null}

        {pageSpeed ? (
          <>
            <div className={styles.lighthouseGrid}>
              {[
                [
                  "Performance",
                  pageSpeed.categories
                    .performance,
                ],
                [
                  "Accessibility",
                  pageSpeed.categories
                    .accessibility,
                ],
                [
                  "Best practices",
                  pageSpeed.categories
                    .bestPractices,
                ],
                [
                  "SEO",
                  pageSpeed.categories
                    .seo,
                ],
              ].map(
                ([label, value]) => {
                  const numeric =
                    typeof value ===
                    "number"
                      ? value
                      : null;

                  return (
                    <article
                      key={String(label)}
                      className={`${styles.lighthouseScore} ${
                        numeric === null
                          ? ""
                          : scoreTone(
                              numeric,
                            )
                      }`}
                    >
                      <span>
                        {label}
                      </span>

                      <strong>
                        {numeric ??
                          "—"}
                      </strong>

                      <small>
                        / 100
                      </small>
                    </article>
                  );
                },
              )}
            </div>

            <div className={styles.webVitals}>
              <div>
                <span>
                  LCP
                </span>

                <strong>
                  {metricMs(
                    pageSpeed.metrics
                      .lcpMs,
                  )}
                </strong>

                <small>
                  Largest Contentful Paint
                </small>
              </div>

              <div>
                <span>
                  CLS
                </span>

                <strong>
                  {metricCls(
                    pageSpeed.metrics
                      .cls,
                  )}
                </strong>

                <small>
                  Cumulative Layout Shift
                </small>
              </div>

              <div>
                <span>
                  TBT
                </span>

                <strong>
                  {metricMs(
                    pageSpeed.metrics
                      .tbtMs,
                  )}
                </strong>

                <small>
                  Total Blocking Time
                </small>
              </div>

              <div>
                <span>
                  FCP
                </span>

                <strong>
                  {metricMs(
                    pageSpeed.metrics
                      .fcpMs,
                  )}
                </strong>

                <small>
                  First Contentful Paint
                </small>
              </div>
            </div>

            {pageSpeed.opportunities.length ? (
              <div className={styles.lighthouseOpportunities}>
                <div className={styles.subheading}>
                  <div>
                    <p className="sa-card__eyebrow">
                      Lighthouse
                    </p>

                    <h3>
                      Performance opportunities
                    </h3>
                  </div>

                  <span className="sa-note">
                    {pageSpeed.strategy}
                  </span>
                </div>

                {pageSpeed.opportunities.map(
                  (item) => (
                    <div
                      key={item.id}
                      className={styles.lighthouseRow}
                    >
                      <div>
                        <strong>
                          {item.title}
                        </strong>

                        {item.displayValue ? (
                          <span>
                            {item.displayValue}
                          </span>
                        ) : null}
                      </div>

                      {item.savingsMs !==
                      null ? (
                        <small>
                          ~
                          {metricMs(
                            item.savingsMs,
                          )}{" "}
                          potential saving
                        </small>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className={styles.successBox}>
                No major Lighthouse performance
                opportunities were returned.
              </div>
            )}
          </>
        ) : null}
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Published pages
          </p>

          <h2>
            Page SEO audit
          </h2>

          <p>
            Scores reflect the live publication,
            not unpublished draft changes.
          </p>
        </div>

        <div className="sa-seo-toolbar">
          <input
            value={query}
            onChange={
              (event) =>
                setQuery(
                  event.target
                    .value,
                )
            }
            placeholder="Search pages…"
            aria-label="Search pages"
          />

          <select
            value={filter}
            onChange={
              (event) =>
                setFilter(
                  event.target
                    .value,
                )
            }
          >
            <option value="all">
              All pages
            </option>

            <option value="good">
              Good
            </option>

            <option value="needs">
              Needs work
            </option>

            <option value="poor">
              Poor
            </option>

            <option value="noindex">
              Noindex
            </option>
          </select>

          <span>
            {filteredPages.length} result(s)
          </span>
        </div>

        <div className="sa-table-scroll">
          <table className="sa-table">
            <thead>
              <tr>
                <th>
                  Page
                </th>

                <th>
                  Score
                </th>

                <th>
                  SEO title
                </th>

                <th>
                  Description
                </th>

                <th>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPages.map(
                (page) => (
                  <tr
                    key={page.file}
                    className={
                      selected ===
                      page.file
                        ? "sa-seo-row--selected"
                        : ""
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="sa-seo-page-link"
                        onClick={() =>
                          selectPage(
                            page,
                          )
                        }
                      >
                        {page.title ||
                          page.path}
                      </button>

                      <div className="sa-table__secondary">
                        {page.path}
                      </div>
                    </td>

                    <td>
                      <strong
                        className={`${styles.tableScore} ${scoreTone(
                          page.audit
                            .score,
                        )}`}
                      >
                        {page.audit
                          .score}
                      </strong>
                    </td>

                    <td>
                      {page.seoTitle ||
                        "—"}
                    </td>

                    <td>
                      {page.seoDescription
                        ? `${page.seoDescription.slice(
                            0,
                            90,
                          )}${
                            page
                              .seoDescription
                              .length >
                            90
                              ? "…"
                              : ""
                          }`
                        : "—"}
                    </td>

                    <td>
                      <span
                        className={`sa-status ${
                          page.audit
                            .status ===
                          "good"
                            ? "sa-status--read"
                            : page.audit
                                  .status ===
                                "poor"
                              ? "sa-status--declined"
                              : "sa-status--pending"
                        }`}
                      >
                        <span className="sa-status__dot" />

                        {scoreLabel(
                          page.audit
                            .status,
                        )}
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPage &&
      draft ? (
        <div
          className="sa-seo-editor-grid"
          id="seo-page-editor"
        >
          <section className="sa-card sa-seo-editor">
            <div className="sa-seo-editor__head">
              <div>
                <span className="sa-page-eyebrow">
                  Page SEO
                </span>

                <h3>
                  {selectedPage.title}
                </h3>

                <p>
                  {selectedPage.path}
                </p>
              </div>

              <a
                className="sa-btn sa-btn--ghost sa-btn--sm"
                href={`/admin/pages/${selectedPage.file}`}
              >
                Edit page
              </a>
            </div>

            <div className={styles.auditPanel}>
              <div className={styles.auditPanelHeader}>
                <div>
                  <span className="sa-page-eyebrow">
                    Live audit
                  </span>

                  <strong>
                    {selectedPage.audit.score}/100
                  </strong>
                </div>

                <span>
                  {scoreLabel(
                    selectedPage.audit
                      .status,
                  )}
                </span>
              </div>

              <div className={styles.checkList}>
                {selectedPage.audit.checks.map(
                  (check) => (
                    <div
                      key={check.key}
                      className={styles.checkRow}
                    >
                      <span>
                        {check.passed
                          ? "✓"
                          : check.tone ===
                              "error"
                            ? "✕"
                            : "!"}
                      </span>

                      <div>
                        <strong>
                          {check.label}
                        </strong>

                        <small>
                          {check.message}
                        </small>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <p className="sa-note">
                This audit represents the live
                published page. Saving below updates
                the draft; publish the page to make
                it live.
              </p>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-title">
                SEO title
              </label>

              <input
                id="page-seo-title"
                value={draft.title}
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,

                      title:
                        event.target
                          .value,
                    })
                }
                placeholder={
                  selectedPage.title
                }
              />

              <div className="sa-field-hint">
                {draft.title.length}/60 characters
              </div>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-description">
                Meta description
              </label>

              <textarea
                id="page-seo-description"
                rows={4}
                value={
                  draft.description
                }
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,

                      description:
                        event.target
                          .value,
                    })
                }
                placeholder={
                  siteSeo.defaultDescription ||
                  "Describe this page for search results."
                }
              />

              <div className="sa-field-hint">
                {draft.description.length}/160 characters
              </div>
            </div>

            <div className="sa-field">
              <label htmlFor="page-seo-og">
                Open Graph image
              </label>

              <input
                id="page-seo-og"
                value={
                  draft.ogImage
                }
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,

                      ogImage:
                        event.target
                          .value,
                    })
                }
                placeholder={
                  siteSeo.ogImage ||
                  "/uploads/social-cover.jpg"
                }
              />

              <div className="sa-field-hint">
                <a href="/admin/media">
                  Open Media
                </a>{" "}
                to copy an image URL.
              </div>
            </div>

            <label className="sa-seo-index-toggle">
              <input
                type="checkbox"
                checked={
                  draft.noindex
                }
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,

                      noindex:
                        event.target
                          .checked,
                    })
                }
              />

              <span>
                <strong>
                  Hide from search engines
                </strong>

                <small>
                  Adds noindex and removes this page
                  from the generated sitemap.
                </small>
              </span>
            </label>

            <button
              type="button"
              className="sa-btn sa-btn--primary"
              onClick={() =>
                void savePageSeo()
              }
              disabled={
                savingPage
              }
            >
              {savingPage
                ? "Saving…"
                : "Save SEO draft"}
            </button>
          </section>

          <aside className="sa-card sa-seo-live-preview">
            <span className="sa-page-eyebrow">
              Search preview
            </span>

            <h3>
              Google result
            </h3>

            <div className="sa-seo-preview">
              <div className="sa-seo-preview__title">
                {draft.title ||
                  selectedPage.title}
              </div>

              <div className="sa-seo-preview__url">
                {siteData &&
                typeof siteData.url ===
                  "string"
                  ? `${siteData.url}${
                      selectedPage.path ===
                      "/"
                        ? ""
                        : selectedPage.path
                    }`
                  : `https://example.com${selectedPage.path}`}
              </div>

              <div className="sa-seo-preview__desc">
                {draft.description ||
                  siteSeo.defaultDescription ||
                  "No description set."}
              </div>
            </div>

            <div className="sa-seo-social-preview">
              <div className="sa-seo-social-preview__image">
                {draft.ogImage ||
                siteSeo.ogImage ? (
                  <img
                    src={
                      draft.ogImage ||
                      siteSeo.ogImage
                    }
                    alt=""
                  />
                ) : (
                  <span>
                    No social image
                  </span>
                )}
              </div>

              <strong>
                {draft.title ||
                  selectedPage.title}
              </strong>

              <p>
                {draft.description ||
                  siteSeo.defaultDescription ||
                  "Add a description for social sharing."}
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Site-wide SEO
          </p>

          <h2>
            Defaults & structured data
          </h2>

          <p>
            Global fallbacks used across the
            website.
          </p>
        </div>

        <div className={styles.settingsGrid}>
          <div className="sa-field">
            <label htmlFor="seo-template">
              Title template
            </label>

            <input
              id="seo-template"
              value={
                siteSeo.titleTemplate
              }
              onChange={
                (event) =>
                  setSiteSeo({
                    ...siteSeo,

                    titleTemplate:
                      event.target
                        .value,
                  })
              }
              placeholder="%s | My Site"
            />
          </div>

          <div className="sa-field">
            <label htmlFor="seo-desc">
              Default description
            </label>

            <textarea
              id="seo-desc"
              value={
                siteSeo.defaultDescription
              }
              onChange={
                (event) =>
                  setSiteSeo({
                    ...siteSeo,

                    defaultDescription:
                      event.target
                        .value,
                  })
              }
              rows={3}
            />

            <div className="sa-field-hint">
              {
                siteSeo
                  .defaultDescription
                  .length
              }
              /160 characters
            </div>
          </div>

          <div className="sa-field">
            <label htmlFor="seo-og">
              Default Open Graph image
            </label>

            <input
              id="seo-og"
              value={
                siteSeo.ogImage
              }
              onChange={
                (event) =>
                  setSiteSeo({
                    ...siteSeo,

                    ogImage:
                      event.target
                        .value,
                  })
              }
              placeholder="/uploads/social-cover.jpg"
            />
          </div>

          <div className="sa-field">
            <label htmlFor="seo-type">
              Business type
            </label>

            <select
              id="seo-type"
              value={
                siteSeo.businessType
              }
              onChange={
                (event) =>
                  setSiteSeo({
                    ...siteSeo,

                    businessType:
                      event.target
                        .value,
                  })
              }
            >
              <option value="">
                Select…
              </option>

              <option value="ProfessionalService">
                Professional Service
              </option>

              <option value="LocalBusiness">
                Local Business
              </option>

              <option value="Restaurant">
                Restaurant
              </option>

              <option value="Store">
                Store
              </option>

              <option value="LodgingBusiness">
                Lodging / Hotel
              </option>

              <option value="HealthAndBeautyBusiness">
                Health & Beauty
              </option>

              <option value="AutomotiveBusiness">
                Automotive
              </option>
            </select>
          </div>
        </div>

        <button
          type="button"
          className="sa-btn sa-btn--primary"
          onClick={() =>
            void saveSiteSeo()
          }
          disabled={saving}
        >
          {saving
            ? "Saving…"
            : "Save site SEO"}
        </button>
      </section>

      {toast ? (
        <div
          className={`sa-toast ${
            toast.ok
              ? "sa-toast--success"
              : "sa-toast--error"
          }`}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
