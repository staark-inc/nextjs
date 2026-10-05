"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import styles from "./automations.module.css";

import {
  ADMIN_REALTIME_EVENT,
  type AdminRealtimeBrowserEvent,
} from "../admin-events";

type Trigger =
  | "submission.received"
  | "submission.status.changed"
  | "booking.status.changed";

type Action =
  | "add_activity"
  | "set_status"
  | "set_booking_status";

type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  triggerConfig: {
    kind?: string;
    formId?: string;
    fromStatus?: string;
    toStatus?: string;
  };
  action: Action;
  actionConfig: {
    message?: string;
    status?: string;
    bookingStatus?: string;
  };
  createdAt: string;
  updatedAt: string;
};

type AutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  eventType: string;
  status: string;
  attempt: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Draft = {
  name: string;
  trigger: Trigger;
  kind: string;
  formId: string;
  toStatus: string;
  action: Action;
  message: string;
  actionStatus: string;
  bookingStatus: string;
};

const INITIAL_DRAFT: Draft = {
  name: "",
  trigger: "submission.received",
  kind: "any",
  formId: "",
  toStatus: "",
  action: "add_activity",
  message: "Follow up with {{name}}.",
  actionStatus: "read",
  bookingStatus: "confirmed",
};

function triggerLabel(
  value: Trigger,
): string {
  if (
    value ===
    "submission.received"
  ) {
    return "New submission";
  }

  if (
    value ===
    "submission.status.changed"
  ) {
    return "Submission status changed";
  }

  return "Booking status changed";
}

function actionLabel(
  value: Action,
): string {
  if (
    value ===
    "add_activity"
  ) {
    return "Add follow-up activity";
  }

  if (
    value ===
    "set_status"
  ) {
    return "Change submission status";
  }

  return "Change booking status";
}

export default function AutomationsPage() {
  const [
    automations,
    setAutomations,
  ] = useState<Automation[]>([]);

  const [
    runs,
    setRuns,
  ] = useState<AutomationRun[]>([]);

  const [
    draft,
    setDraft,
  ] = useState<Draft>(
    INITIAL_DRAFT,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError("");

        try {
          const [
            automationRes,
            runsRes,
          ] =
            await Promise.all([
              fetch(
                "/api/admin/automations",
                {
                  cache:
                    "no-store",
                },
              ),

              fetch(
                "/api/admin/automations/runs",
                {
                  cache:
                    "no-store",
                },
              ),
            ]);

          const automationData =
            await automationRes.json();

          const runsData =
            await runsRes.json();

          if (!automationRes.ok) {
            throw new Error(
              automationData.error ??
              "Could not load automations.",
            );
          }

          if (!runsRes.ok) {
            throw new Error(
              runsData.error ??
              "Could not load automation runs.",
            );
          }

          setAutomations(
            automationData.automations ??
            [],
          );

          setRuns(
            runsData.runs ??
            [],
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load automations.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  useEffect(
    () => {
      let timer:
        ReturnType<
          typeof setTimeout
        > | null =
          null;

      function onRealtime(
        event: Event,
      ) {
        const detail =
          (
            event as CustomEvent<
              AdminRealtimeBrowserEvent
            >
          ).detail;

        if (
          detail.type !== "automation.succeeded" &&
          detail.type !== "automation.failed"
        ) {
          return;
        }

        /*
         * Debounce bursts so one workflow does not cause
         * several identical API reloads.
         */
        if (timer) {
          clearTimeout(
            timer,
          );
        }

        timer =
          setTimeout(
            () => {
              timer =
                null;

              void load();
            },
            120,
          );
      }

      window.addEventListener(
        ADMIN_REALTIME_EVENT,
        onRealtime,
      );

      return () => {
        if (timer) {
          clearTimeout(
            timer,
          );
        }

        window.removeEventListener(
          ADMIN_REALTIME_EVENT,
          onRealtime,
        );
      };
    },
    [
      load,
    ],
  );

  async function createAutomation() {
    setSaving(
      true,
    );

    setError("");

    const triggerConfig:
      Record<string, string> = {
        kind:
          draft.kind,
      };

    if (
      draft.formId.trim()
    ) {
      triggerConfig.formId =
        draft.formId.trim();
    }

    if (
      draft.toStatus
    ) {
      triggerConfig.toStatus =
        draft.toStatus;
    }

    const actionConfig:
      Record<string, string> =
        draft.action ===
        "add_activity"
          ? {
              message:
                draft.message,
            }
          : draft.action ===
              "set_status"
            ? {
                status:
                  draft.actionStatus,
              }
            : {
                bookingStatus:
                  draft.bookingStatus,
              };

    try {
      const response =
        await fetch(
          "/api/admin/automations",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  draft.name,

                enabled:
                  true,

                trigger:
                  draft.trigger,

                triggerConfig,

                action:
                  draft.action,

                actionConfig,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Could not create automation.",
        );
      }

      setDraft(
        INITIAL_DRAFT,
      );

      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create automation.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function toggleAutomation(
    automation: Automation,
  ) {
    const response =
      await fetch(
        `/api/admin/automations/${automation.id}`,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              enabled:
                !automation.enabled,
            }),
        },
      );

    if (!response.ok) {
      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      setError(
        data.error ??
        "Could not update automation.",
      );

      return;
    }

    await load();
  }

  async function removeAutomation(
    automation: Automation,
  ) {
    if (
      !window.confirm(
        `Delete "${automation.name}"? Its run history will also be deleted.`,
      )
    ) {
      return;
    }

    const response =
      await fetch(
        `/api/admin/automations/${automation.id}`,
        {
          method:
            "DELETE",
        },
      );

    if (!response.ok) {
      setError(
        "Could not delete automation.",
      );

      return;
    }

    await load();
  }

  async function retryRun(
    run: AutomationRun,
  ) {
    const response =
      await fetch(
        `/api/admin/automations/runs/${run.id}/retry`,
        {
          method:
            "POST",
        },
      );

    if (!response.ok) {
      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      setError(
        data.error ??
        "Could not retry automation.",
      );

      return;
    }

    await load();
  }

  if (loading) {
    return (
      <div className="sa-loading">
        Loading automations…
      </div>
    );
  }

  const enabledCount =
    automations.filter(
      (automation) =>
        automation.enabled,
    ).length;

  const failedRuns =
    runs.filter(
      (run) =>
        run.status ===
        "failed",
    ).length;

  const successfulRuns =
    runs.filter(
      (run) =>
        run.status ===
        "success",
    ).length;

  return (
    <div className={styles.page}>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">
            Growth
          </span>

          <h1 className="sa-h1">
            Automations
          </h1>

          <p className="sa-subtitle">
            Turn new leads, messages and booking
            changes into repeatable workflows.
          </p>
        </div>
      </section>

      <div className="sa-stats sa-stats--dashboard">
        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Automations
          </div>

          <div className="sa-stat__value">
            {automations.length}
          </div>

          <div className="sa-stat__desc">
            Total workflows
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Active
          </div>

          <div className="sa-stat__value">
            {enabledCount}
          </div>

          <div className="sa-stat__desc">
            Currently enabled
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Successful runs
          </div>

          <div className="sa-stat__value">
            {successfulRuns}
          </div>

          <div className="sa-stat__desc">
            Recent history
          </div>
        </div>

        <div className="sa-stat sa-stat--v2">
          <div className="sa-stat__label">
            Failed
          </div>

          <div className="sa-stat__value">
            {failedRuns}
          </div>

          <div className="sa-stat__desc">
            Retry available
          </div>
        </div>
      </div>

      {error ? (
        <div className={styles.error}>
          {error}
        </div>
      ) : null}

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            New workflow
          </p>

          <h2>
            Create automation
          </h2>

          <p>
            Choose when it runs, narrow the trigger,
            then choose the action.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className="sa-field">
            <label htmlFor="automation-name">
              Name
            </label>

            <input
              id="automation-name"
              value={draft.name}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    name:
                      event.target.value,
                  })
              }
              placeholder="Follow up new leads"
            />
          </div>

          <div className="sa-field">
            <label htmlFor="automation-trigger">
              Trigger
            </label>

            <select
              id="automation-trigger"
              value={draft.trigger}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    trigger:
                      event.target.value as Trigger,
                    toStatus:
                      "",
                  })
              }
            >
              <option value="submission.received">
                New submission
              </option>

              <option value="submission.status.changed">
                Submission status changed
              </option>

              <option value="booking.status.changed">
                Booking status changed
              </option>
            </select>
          </div>

          <div className="sa-field">
            <label htmlFor="automation-kind">
              Submission type
            </label>

            <select
              id="automation-kind"
              value={draft.kind}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    kind:
                      event.target.value,
                  })
              }
            >
              <option value="any">
                Any
              </option>

              <option value="contact">
                Contact
              </option>

              <option value="lead">
                Lead
              </option>

              <option value="booking">
                Booking
              </option>
            </select>
          </div>

          <div className="sa-field">
            <label htmlFor="automation-form">
              Form ID
            </label>

            <input
              id="automation-form"
              value={draft.formId}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    formId:
                      event.target.value,
                  })
              }
              placeholder="Optional"
            />
          </div>

          {draft.trigger ===
          "submission.status.changed" ? (
            <div className="sa-field">
              <label>
                New status
              </label>

              <select
                value={draft.toStatus}
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,
                      toStatus:
                        event.target.value,
                    })
                }
              >
                <option value="">
                  Any
                </option>

                <option value="new">
                  New
                </option>

                <option value="read">
                  Read
                </option>

                <option value="replied">
                  Replied
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>
            </div>
          ) : null}

          {draft.trigger ===
          "booking.status.changed" ? (
            <div className="sa-field">
              <label>
                New booking status
              </label>

              <select
                value={draft.toStatus}
                onChange={
                  (event) =>
                    setDraft({
                      ...draft,
                      toStatus:
                        event.target.value,
                    })
                }
              >
                <option value="">
                  Any
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="confirmed">
                  Confirmed
                </option>

                <option value="declined">
                  Declined
                </option>
              </select>
            </div>
          ) : null}

          <div className="sa-field">
            <label htmlFor="automation-action">
              Action
            </label>

            <select
              id="automation-action"
              value={draft.action}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    action:
                      event.target.value as Action,
                  })
              }
            >
              <option value="add_activity">
                Add follow-up activity
              </option>

              <option value="set_status">
                Change submission status
              </option>

              <option value="set_booking_status">
                Change booking status
              </option>
            </select>
          </div>
        </div>

        {draft.action ===
        "add_activity" ? (
          <div className="sa-field">
            <label htmlFor="automation-message">
              Activity / follow-up message
            </label>

            <textarea
              id="automation-message"
              rows={3}
              value={draft.message}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    message:
                      event.target.value,
                  })
              }
            />

            <div className="sa-field-hint">
              Variables: {"{{name}}"}, {"{{email}}"},
              {" {{phone}}"}, {"{{submissionId}}"},
              {" {{kind}}"}, {"{{status}}"}
            </div>
          </div>
        ) : null}

        {draft.action ===
        "set_status" ? (
          <div className="sa-field">
            <label>
              Set status to
            </label>

            <select
              value={draft.actionStatus}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    actionStatus:
                      event.target.value,
                  })
              }
            >
              <option value="new">
                New
              </option>

              <option value="read">
                Read
              </option>

              <option value="replied">
                Replied
              </option>

              <option value="archived">
                Archived
              </option>
            </select>
          </div>
        ) : null}

        {draft.action ===
        "set_booking_status" ? (
          <div className="sa-field">
            <label>
              Set booking status to
            </label>

            <select
              value={draft.bookingStatus}
              onChange={
                (event) =>
                  setDraft({
                    ...draft,
                    bookingStatus:
                      event.target.value,
                  })
              }
            >
              <option value="pending">
                Pending
              </option>

              <option value="confirmed">
                Confirmed
              </option>

              <option value="declined">
                Declined
              </option>
            </select>
          </div>
        ) : null}

        <button
          type="button"
          className="sa-btn sa-btn--primary"
          disabled={
            saving ||
            !draft.name.trim()
          }
          onClick={() =>
            void createAutomation()
          }
        >
          {saving
            ? "Creating…"
            : "Create automation"}
        </button>
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Workflows
          </p>

          <h2>
            Active automations
          </h2>
        </div>

        {!automations.length ? (
          <div className="sa-empty">
            <div className="sa-empty__title">
              No automations yet
            </div>

            <div className="sa-empty__desc">
              Create your first workflow above.
            </div>
          </div>
        ) : (
          <div className={styles.ruleList}>
            {automations.map(
              (automation) => (
                <article
                  key={automation.id}
                  className={styles.rule}
                >
                  <div className={styles.ruleMain}>
                    <div className={styles.ruleTitle}>
                      <strong>
                        {automation.name}
                      </strong>

                      <span
                        className={
                          automation.enabled
                            ? styles.enabled
                            : styles.disabled
                        }
                      >
                        {automation.enabled
                          ? "Active"
                          : "Paused"}
                      </span>
                    </div>

                    <div className={styles.flow}>
                      <span>
                        WHEN
                      </span>

                      <strong>
                        {triggerLabel(
                          automation.trigger,
                        )}
                      </strong>

                      <b>
                        →
                      </b>

                      <span>
                        THEN
                      </span>

                      <strong>
                        {actionLabel(
                          automation.action,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.ruleActions}>
                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost sa-btn--sm"
                      onClick={() =>
                        void toggleAutomation(
                          automation,
                        )
                      }
                    >
                      {automation.enabled
                        ? "Pause"
                        : "Enable"}
                    </button>

                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost sa-btn--sm"
                      onClick={() =>
                        void removeAutomation(
                          automation,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="sa-card">
        <div className="sa-card__header">
          <p className="sa-card__eyebrow">
            Audit log
          </p>

          <h2>
            Recent runs
          </h2>

          <p>
            Every automation execution is recorded
            with status and retry count.
          </p>
        </div>

        {!runs.length ? (
          <div className="sa-empty">
            <div className="sa-empty__title">
              No runs yet
            </div>

            <div className="sa-empty__desc">
              Runs appear here after a trigger fires.
            </div>
          </div>
        ) : (
          <div className="sa-table-scroll">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>
                    Automation
                  </th>

                  <th>
                    Event
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Attempts
                  </th>

                  <th>
                    Time
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {runs.map(
                  (run) => (
                    <tr key={run.id}>
                      <td>
                        <strong>
                          {run.automationName}
                        </strong>

                        {run.error ? (
                          <div className="sa-table__secondary">
                            {run.error}
                          </div>
                        ) : null}
                      </td>

                      <td>
                        {run.eventType}
                      </td>

                      <td>
                        <span
                          className={`sa-status ${
                            run.status ===
                            "success"
                              ? "sa-status--read"
                              : run.status ===
                                  "failed"
                                ? "sa-status--declined"
                                : "sa-status--pending"
                          }`}
                        >
                          <span className="sa-status__dot" />

                          {run.status}
                        </span>
                      </td>

                      <td>
                        {run.attempt}
                      </td>

                      <td className="sa-table__date">
                        {new Date(
                          run.createdAt,
                        ).toLocaleString()}
                      </td>

                      <td>
                        {run.status ===
                        "failed" ? (
                          <button
                            type="button"
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            onClick={() =>
                              void retryRun(
                                run,
                              )
                            }
                          >
                            Retry
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
