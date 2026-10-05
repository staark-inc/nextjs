"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./redirects.module.css";

type RedirectStatus =
  | 301
  | 302;

type RedirectSource =
  | "manual"
  | "page-path-change";

type RedirectRule = {
  id: string;
  from: string;
  to: string;
  status: RedirectStatus;
  enabled: boolean;
  source: RedirectSource;
  createdAt: string;
  updatedAt: string;
};

type RedirectIssue = {
  severity:
    | "error"
    | "warning";

  ruleId?: string;
  message: string;
};

type StatusFilter =
  | "all"
  | "301"
  | "302";

type StateFilter =
  | "all"
  | "active"
  | "disabled";

type SourceFilter =
  | "all"
  | RedirectSource;

const emptyDraft = {
  from:
    "",

  to:
    "",

  status:
    301 as RedirectStatus,
};

function internalPath(
  target: string,
): string | null {
  if (
    !target.startsWith("/")
  ) {
    return null;
  }

  return (
    target
      .split(/[?#]/u, 1)[0] ||
    "/"
  );
}

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(date);
}

export default function RedirectsPage() {
  const [
    redirects,
    setRedirects,
  ] =
    useState<RedirectRule[]>(
      [],
    );

  const [
    issues,
    setIssues,
  ] =
    useState<RedirectIssue[]>(
      [],
    );

  const [
    draft,
    setDraft,
  ] =
    useState(
      emptyDraft,
    );

  const [
    working,
    setWorking,
  ] =
    useState(
      "",
    );

  const [
    toast,
    setToast,
  ] =
    useState<{
      msg: string;
      ok: boolean;
    } | null>(
      null,
    );

  const [
    query,
    setQuery,
  ] =
    useState(
      "",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    stateFilter,
    setStateFilter,
  ] =
    useState<StateFilter>(
      "all",
    );

  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState<SourceFilter>(
      "all",
    );

  const [
    selected,
    setSelected,
  ] =
    useState<Set<string>>(
      new Set(),
    );

  const activeCount =
    redirects.filter(
      (rule) =>
        rule.enabled,
    ).length;

  const permanentCount =
    redirects.filter(
      (rule) =>
        rule.status ===
        301,
    ).length;

  const temporaryCount =
    redirects.filter(
      (rule) =>
        rule.status ===
        302,
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning",
    ).length;

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
        setToast(
          null,
        ),
      3500,
    );
  }

  function applyState(
    data: {
      redirects?:
        RedirectRule[];

      issues?:
        RedirectIssue[];
    },
  ) {
    setRedirects(
      data.redirects ??
        [],
    );

    setIssues(
      data.issues ??
        [],
    );

    setSelected(
      (current) =>
        new Set(
          [
            ...current,
          ].filter(
            (id) =>
              (
                data.redirects ??
                []
              ).some(
                (rule) =>
                  rule.id ===
                  id,
              ),
          ),
        ),
    );
  }

  async function load() {
    const res =
      await fetch(
        "/api/admin/redirects",
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
        );

    if (
      !res.ok
    ) {
      showToast(
        (
          data as {
            error?: string;
          }
        ).error ??
          "Could not load redirects.",
        false,
      );

      return;
    }

    applyState(
      data,
    );
  }

  useEffect(
    () => {
      void load();
    },
    [],
  );

  async function create() {
    setWorking(
      "create",
    );

    const res =
      await fetch(
        "/api/admin/redirects",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              ...draft,
              enabled:
                true,
            }),
        },
      );

    const data =
      await res
        .json()
        .catch(
          () => ({}),
        );

    setWorking(
      "",
    );

    if (
      !res.ok
    ) {
      showToast(
        (
          data as {
            error?: string;
          }
        ).error ??
          "Could not create redirect.",
        false,
      );

      return;
    }

    applyState(
      data,
    );

    setDraft(
      emptyDraft,
    );

    showToast(
      "Redirect created and active.",
      true,
    );
  }

  function patchLocal(
    id: string,
    patch: Partial<RedirectRule>,
  ) {
    setRedirects(
      (current) =>
        current.map(
          (rule) =>
            rule.id ===
            id
              ? {
                  ...rule,
                  ...patch,
                }
              : rule,
        ),
    );
  }

  async function save(
    rule: RedirectRule,
    quiet =
      false,
  ): Promise<boolean> {
    setWorking(
      `save:${rule.id}`,
    );

    const res =
      await fetch(
        "/api/admin/redirects",
        {
          method:
            "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              rule,
            ),
        },
      );

    const data =
      await res
        .json()
        .catch(
          () => ({}),
        );

    setWorking(
      "",
    );

    if (
      !res.ok
    ) {
      if (
        !quiet
      ) {
        showToast(
          (
            data as {
              error?: string;
            }
          ).error ??
            "Could not save redirect.",
          false,
        );
      }

      await load();

      return false;
    }

    applyState(
      data,
    );

    if (
      !quiet
    ) {
      showToast(
        "Redirect saved.",
        true,
      );
    }

    return true;
  }

  async function toggle(
    rule: RedirectRule,
  ) {
    const next = {
      ...rule,

      enabled:
        !rule.enabled,
    };

    patchLocal(
      rule.id,
      {
        enabled:
          next.enabled,
      },
    );

    await save(
      next,
    );
  }

  async function remove(
    rule: RedirectRule,
  ) {
    if (
      !confirm(
        `Delete redirect ${rule.from} → ${rule.to}?`,
      )
    ) {
      return;
    }

    setWorking(
      `delete:${rule.id}`,
    );

    const res =
      await fetch(
        "/api/admin/redirects",
        {
          method:
            "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              id:
                rule.id,
            }),
        },
      );

    const data =
      await res
        .json()
        .catch(
          () => ({}),
        );

    setWorking(
      "",
    );

    if (
      !res.ok
    ) {
      showToast(
        (
          data as {
            error?: string;
          }
        ).error ??
          "Could not delete redirect.",
        false,
      );

      return;
    }

    applyState(
      data,
    );

    showToast(
      "Redirect deleted.",
      true,
    );
  }

  const ruleIssues =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            RedirectIssue[]
          >();

        for (
          const issue of issues
        ) {
          if (
            !issue.ruleId
          ) {
            continue;
          }

          const list =
            map.get(
              issue.ruleId,
            ) ??
            [];

          list.push(
            issue,
          );

          map.set(
            issue.ruleId,
            list,
          );
        }

        return map;
      },
      [
        issues,
      ],
    );

  const activeBySource =
    useMemo(
      () =>
        new Map(
          redirects
            .filter(
              (rule) =>
                rule.enabled,
            )
            .map(
              (rule) => [
                rule.from,
                rule,
              ],
            ),
        ),
      [
        redirects,
      ],
    );

  function resolveChain(
    rule: RedirectRule,
  ): {
    path: string[];
    finalTarget: string | null;
    chained: boolean;
    loop: boolean;
  } {
    const path =
      [
        rule.from,
        rule.to,
      ];

    let target =
      internalPath(
        rule.to,
      );

    if (
      !target
    ) {
      return {
        path,
        finalTarget:
          rule.to,

        chained:
          false,

        loop:
          false,
      };
    }

    const visited =
      new Set<string>([
        rule.from,
      ]);

    let chained =
      false;

    while (
      target &&
      activeBySource.has(
        target,
      )
    ) {
      if (
        visited.has(
          target,
        )
      ) {
        return {
          path,
          finalTarget:
            null,

          chained:
            true,

          loop:
            true,
        };
      }

      visited.add(
        target,
      );

      const next =
        activeBySource.get(
          target,
        )!;

      chained =
        true;

      path.push(
        next.to,
      );

      target =
        internalPath(
          next.to,
        );

      if (
        !target
      ) {
        return {
          path,
          finalTarget:
            next.to,

          chained,
          loop:
            false,
        };
      }
    }

    return {
      path,
      finalTarget:
        target,

      chained,
      loop:
        false,
    };
  }

  async function fixChain(
    rule: RedirectRule,
  ) {
    const chain =
      resolveChain(
        rule,
      );

    if (
      !chain.chained ||
      chain.loop ||
      !chain.finalTarget
    ) {
      return;
    }

    await save({
      ...rule,

      to:
        chain.finalTarget,
    });
  }

  const filtered =
    useMemo(
      () => {
        const normalizedQuery =
          query
            .trim()
            .toLowerCase();

        return redirects.filter(
          (rule) => {
            if (
              normalizedQuery &&
              !rule.from
                .toLowerCase()
                .includes(
                  normalizedQuery,
                ) &&
              !rule.to
                .toLowerCase()
                .includes(
                  normalizedQuery,
                )
            ) {
              return false;
            }

            if (
              statusFilter !==
                "all" &&
              String(
                rule.status,
              ) !==
                statusFilter
            ) {
              return false;
            }

            if (
              stateFilter ===
                "active" &&
              !rule.enabled
            ) {
              return false;
            }

            if (
              stateFilter ===
                "disabled" &&
              rule.enabled
            ) {
              return false;
            }

            if (
              sourceFilter !==
                "all" &&
              rule.source !==
                sourceFilter
            ) {
              return false;
            }

            return true;
          },
        );
      },
      [
        redirects,
        query,
        statusFilter,
        stateFilter,
        sourceFilter,
      ],
    );

  const allVisibleSelected =
    filtered.length >
      0 &&
    filtered.every(
      (rule) =>
        selected.has(
          rule.id,
        ),
    );

  function toggleSelected(
    id: string,
  ) {
    setSelected(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            id,
          )
        ) {
          next.delete(
            id,
          );
        } else {
          next.add(
            id,
          );
        }

        return next;
      },
    );
  }

  function toggleAllVisible() {
    setSelected(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          allVisibleSelected
        ) {
          for (
            const rule of filtered
          ) {
            next.delete(
              rule.id,
            );
          }
        } else {
          for (
            const rule of filtered
          ) {
            next.add(
              rule.id,
            );
          }
        }

        return next;
      },
    );
  }

  async function bulkSetEnabled(
    enabled: boolean,
  ) {
    const targets =
      redirects.filter(
        (rule) =>
          selected.has(
            rule.id,
          ) &&
          rule.enabled !==
            enabled,
      );

    if (
      !targets.length
    ) {
      showToast(
        enabled
          ? "Selected redirects are already enabled."
          : "Selected redirects are already disabled.",
        true,
      );

      return;
    }

    setWorking(
      "bulk",
    );

    try {
      for (
        const rule of targets
      ) {
        const res =
          await fetch(
            "/api/admin/redirects",
            {
              method:
                "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  ...rule,
                  enabled,
                }),
            },
          );

        if (
          !res.ok
        ) {
          const data =
            await res
              .json()
              .catch(
                () => ({}),
              );

          throw new Error(
            (
              data as {
                error?: string;
              }
            ).error ??
              "Bulk update failed.",
          );
        }
      }

      await load();

      setSelected(
        new Set(),
      );

      showToast(
        `${targets.length} redirect${
          targets.length ===
            1
            ? ""
            : "s"
        } ${
          enabled
            ? "enabled"
            : "disabled"
        }.`,
        true,
      );
    } catch (
      error
    ) {
      await load();

      showToast(
        error instanceof Error
          ? error.message
          : "Bulk update failed.",
        false,
      );
    } finally {
      setWorking(
        "",
      );
    }
  }

  async function bulkDelete() {
    const targets =
      redirects.filter(
        (rule) =>
          selected.has(
            rule.id,
          ),
      );

    if (
      !targets.length
    ) {
      return;
    }

    if (
      !confirm(
        `Delete ${targets.length} selected redirect${
          targets.length ===
            1
            ? ""
            : "s"
        }?`,
      )
    ) {
      return;
    }

    setWorking(
      "bulk",
    );

    try {
      for (
        const rule of targets
      ) {
        const res =
          await fetch(
            "/api/admin/redirects",
            {
              method:
                "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  id:
                    rule.id,
                }),
            },
          );

        if (
          !res.ok
        ) {
          const data =
            await res
              .json()
              .catch(
                () => ({}),
              );

          throw new Error(
            (
              data as {
                error?: string;
              }
            ).error ??
              "Bulk delete failed.",
          );
        }
      }

      await load();

      setSelected(
        new Set(),
      );

      showToast(
        `${targets.length} redirect${
          targets.length ===
            1
            ? ""
            : "s"
        } deleted.`,
        true,
      );
    } catch (
      error
    ) {
      await load();

      showToast(
        error instanceof Error
          ? error.message
          : "Bulk delete failed.",
        false,
      );
    } finally {
      setWorking(
        "",
      );
    }
  }

  function openSource(
    rule: RedirectRule,
  ) {
    window.open(
      new URL(
        rule.from,
        window.location.origin,
      ).toString(),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openDestination(
    rule: RedirectRule,
  ) {
    const href =
      rule.to.startsWith("/")
        ? new URL(
            rule.to,
            window.location.origin,
          ).toString()
        : rule.to;

    window.open(
      href,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <>
      <div className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">
            Traffic & SEO
          </span>

          <h1 className="sa-h1">
            Redirects
          </h1>

          <p className="sa-subtitle">
            Keep old URLs working when pages
            move. Rules apply immediately
            without rebuilding the site.
          </p>
        </div>
      </div>

      <section
        className="sa-stats sa-stats--dashboard"
        aria-label="Redirect overview"
      >
        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Active
          </div>

          <div className="sa-stat__value">
            {activeCount}
          </div>

          <div className="sa-stat__desc">
            Live redirect rules
          </div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Permanent
          </div>

          <div className="sa-stat__value">
            {permanentCount}
          </div>

          <div className="sa-stat__desc">
            301 redirects
          </div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Temporary
          </div>

          <div className="sa-stat__value">
            {temporaryCount}
          </div>

          <div className="sa-stat__desc">
            302 redirects
          </div>
        </article>

        <article className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Warnings
          </div>

          <div className="sa-stat__value">
            {warningCount}
          </div>

          <div className="sa-stat__desc">
            Chains or destinations to review
          </div>
        </article>
      </section>

      {issues.length ? (
        <section className={styles.issues}>
          {issues.map(
            (
              issue,
              index,
            ) => (
              <div
                className={
                  issue.severity ===
                  "error"
                    ? styles.issueError
                    : styles.issueWarning
                }
                key={`${issue.message}-${index}`}
              >
                <strong>
                  {issue.severity ===
                  "error"
                    ? "Error"
                    : "Warning"}
                </strong>

                <span>
                  {issue.message}
                </span>
              </div>
            ),
          )}
        </section>
      ) : null}

      <section
        className={`sa-card ${styles.create}`}
      >
        <div>
          <span className="sa-card__eyebrow">
            New rule
          </span>

          <h2>
            Create redirect
          </h2>

          <p>
            Use 301 for permanent moves and
            302 for temporary redirects.
          </p>
        </div>

        <div className={styles.createFields}>
          <input
            value={
              draft.from
            }
            onChange={
              (event) =>
                setDraft(
                  (current) => ({
                    ...current,

                    from:
                      event
                        .target
                        .value,
                  }),
                )
            }
            placeholder="/old-page"
            aria-label="Redirect source"
          />

          <span aria-hidden="true">
            →
          </span>

          <input
            value={
              draft.to
            }
            onChange={
              (event) =>
                setDraft(
                  (current) => ({
                    ...current,

                    to:
                      event
                        .target
                        .value,
                  }),
                )
            }
            placeholder="/new-page or https://…"
            aria-label="Redirect destination"
          />

          <select
            value={
              draft.status
            }
            onChange={
              (event) =>
                setDraft(
                  (current) => ({
                    ...current,

                    status:
                      Number(
                        event
                          .target
                          .value,
                      ) as RedirectStatus,
                  }),
                )
            }
            aria-label="Redirect status"
          >
            <option value={301}>
              301 Permanent
            </option>

            <option value={302}>
              302 Temporary
            </option>
          </select>

          <button
            className="sa-btn sa-btn--primary"
            onClick={
              () =>
                void create()
            }
            disabled={
              working ===
                "create" ||
              !draft.from.trim() ||
              !draft.to.trim()
            }
          >
            {working ===
            "create"
              ? "Creating…"
              : "Create redirect"}
          </button>
        </div>
      </section>

      <section
        className={`sa-card ${styles.listCard}`}
      >
        <div className={styles.listHeader}>
          <div>
            <span className="sa-card__eyebrow">
              Rules
            </span>

            <h2>
              {redirects.length} redirect{
                redirects.length ===
                  1
                  ? ""
                  : "s"
              }
            </h2>
          </div>

          <span className={styles.hint}>
            Changing a page path creates a
            301 automatically.
          </span>
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="search"
            value={
              query
            }
            onChange={
              (event) =>
                setQuery(
                  event.target.value,
                )
            }
            placeholder="Search from or destination…"
            aria-label="Search redirects"
          />

          <select
            value={
              stateFilter
            }
            onChange={
              (event) =>
                setStateFilter(
                  event.target
                    .value as StateFilter,
                )
            }
            aria-label="Filter redirect state"
          >
            <option value="all">
              All states
            </option>

            <option value="active">
              Active
            </option>

            <option value="disabled">
              Disabled
            </option>
          </select>

          <select
            value={
              statusFilter
            }
            onChange={
              (event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
            }
            aria-label="Filter redirect status"
          >
            <option value="all">
              All status codes
            </option>

            <option value="301">
              301 Permanent
            </option>

            <option value="302">
              302 Temporary
            </option>
          </select>

          <select
            value={
              sourceFilter
            }
            onChange={
              (event) =>
                setSourceFilter(
                  event.target
                    .value as SourceFilter,
                )
            }
            aria-label="Filter redirect source"
          >
            <option value="all">
              All sources
            </option>

            <option value="manual">
              Manual
            </option>

            <option value="page-path-change">
              Page move
            </option>
          </select>
        </div>

        {redirects.length ? (
          <>
            <div className={styles.bulkBar}>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={
                    allVisibleSelected
                  }
                  onChange={
                    toggleAllVisible
                  }
                />

                <span>
                  {selected.size
                    ? `${selected.size} selected`
                    : `${filtered.length} shown`}
                </span>
              </label>

              {selected.size ? (
                <div className={styles.bulkActions}>
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    type="button"
                    disabled={
                      working ===
                      "bulk"
                    }
                    onClick={
                      () =>
                        void bulkSetEnabled(
                          true,
                        )
                    }
                  >
                    Enable
                  </button>

                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    type="button"
                    disabled={
                      working ===
                      "bulk"
                    }
                    onClick={
                      () =>
                        void bulkSetEnabled(
                          false,
                        )
                    }
                  >
                    Disable
                  </button>

                  <button
                    className="sa-btn sa-btn--danger sa-btn--sm"
                    type="button"
                    disabled={
                      working ===
                      "bulk"
                    }
                    onClick={
                      () =>
                        void bulkDelete()
                    }
                  >
                    Delete selected
                  </button>
                </div>
              ) : null}
            </div>

            {filtered.length ? (
              <div className={styles.list}>
                {filtered.map(
                  (rule) => {
                    const chain =
                      resolveChain(
                        rule,
                      );

                    const currentIssues =
                      ruleIssues.get(
                        rule.id,
                      ) ??
                      [];

                    return (
                      <article
                        className={`${styles.row} ${
                          !rule.enabled
                            ? styles.rowDisabled
                            : ""
                        }`}
                        key={
                          rule.id
                        }
                      >
                        <div className={styles.selectCell}>
                          <input
                            type="checkbox"
                            checked={
                              selected.has(
                                rule.id,
                              )
                            }
                            onChange={
                              () =>
                                toggleSelected(
                                  rule.id,
                                )
                            }
                            aria-label={`Select redirect ${rule.from}`}
                          />

                          <div className={styles.statusCell}>
                            <button
                              type="button"
                              className={`${styles.toggle} ${
                                rule.enabled
                                  ? styles.toggleOn
                                  : ""
                              }`}
                              onClick={
                                () =>
                                  void toggle(
                                    rule,
                                  )
                              }
                              aria-label={
                                rule.enabled
                                  ? "Disable redirect"
                                  : "Enable redirect"
                              }
                              disabled={
                                Boolean(
                                  working,
                                )
                              }
                            >
                              <span />
                            </button>

                            <small>
                              {rule.enabled
                                ? "Active"
                                : "Off"}
                            </small>
                          </div>
                        </div>

                        <div className={styles.ruleMain}>
                          <div className={styles.ruleFields}>
                            <label>
                              <span>
                                From
                              </span>

                              <input
                                value={
                                  rule.from
                                }
                                onChange={
                                  (event) =>
                                    patchLocal(
                                      rule.id,
                                      {
                                        from:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                }
                              />
                            </label>

                            <span className={styles.arrow}>
                              →
                            </span>

                            <label>
                              <span>
                                To
                              </span>

                              <input
                                value={
                                  rule.to
                                }
                                onChange={
                                  (event) =>
                                    patchLocal(
                                      rule.id,
                                      {
                                        to:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                }
                              />
                            </label>

                            <label className={styles.statusSelect}>
                              <span>
                                Status
                              </span>

                              <select
                                value={
                                  rule.status
                                }
                                onChange={
                                  (event) =>
                                    patchLocal(
                                      rule.id,
                                      {
                                        status:
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ) as RedirectStatus,
                                      },
                                    )
                                }
                              >
                                <option value={301}>
                                  301
                                </option>

                                <option value={302}>
                                  302
                                </option>
                              </select>
                            </label>
                          </div>

                          {chain.chained ? (
                            <div className={styles.chain}>
                              <div>
                                <strong>
                                  Redirect chain
                                </strong>

                                <span>
                                  {chain.path.join(
                                    " → ",
                                  )}
                                </span>
                              </div>

                              {!chain.loop &&
                              chain.finalTarget ? (
                                <button
                                  type="button"
                                  className="sa-btn sa-btn--ghost sa-btn--sm"
                                  disabled={
                                    Boolean(
                                      working,
                                    )
                                  }
                                  onClick={
                                    () =>
                                      void fixChain(
                                        rule,
                                      )
                                  }
                                >
                                  Fix chain
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          {currentIssues.length ? (
                            <div className={styles.rowIssues}>
                              {currentIssues.map(
                                (issue) => (
                                  <span
                                    key={
                                      issue.message
                                    }
                                    className={
                                      issue.severity ===
                                      "error"
                                        ? styles.rowIssueError
                                        : styles.rowIssueWarning
                                    }
                                  >
                                    {
                                      issue.message
                                    }
                                  </span>
                                ),
                              )}
                            </div>
                          ) : null}

                          <div className={styles.metaLine}>
                            <span
                              className={
                                rule.source ===
                                "page-path-change"
                                  ? styles.sourceAuto
                                  : styles.sourceManual
                              }
                            >
                              {rule.source ===
                              "page-path-change"
                                ? "Page move"
                                : "Manual"}
                            </span>

                            <span>
                              Created{" "}
                              {formatDate(
                                rule.createdAt,
                              )}
                            </span>

                            <span>
                              Updated{" "}
                              {formatDate(
                                rule.updatedAt,
                              )}
                            </span>
                          </div>
                        </div>

                        <div className={styles.actions}>
                          <button
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            type="button"
                            onClick={
                              () =>
                                openSource(
                                  rule,
                                )
                            }
                          >
                            Test source ↗
                          </button>

                          <button
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            type="button"
                            onClick={
                              () =>
                                openDestination(
                                  rule,
                                )
                            }
                          >
                            Open target ↗
                          </button>

                          <button
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            onClick={
                              () =>
                                void save(
                                  rule,
                                )
                            }
                            disabled={
                              Boolean(
                                working,
                              )
                            }
                          >
                            {working ===
                            `save:${rule.id}`
                              ? "Saving…"
                              : "Save"}
                          </button>

                          <button
                            className="sa-btn sa-btn--danger sa-btn--sm"
                            onClick={
                              () =>
                                void remove(
                                  rule,
                                )
                            }
                            disabled={
                              Boolean(
                                working,
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="sa-empty">
                <div className="sa-empty__title">
                  No matching redirects
                </div>

                <div className="sa-empty__desc">
                  Change the search or filters
                  to show more rules.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">
              No redirects yet
            </div>

            <div className="sa-empty__desc">
              Create a rule manually, or
              change the path of an existing
              page.
            </div>
          </div>
        )}
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
    </>
  );
}
