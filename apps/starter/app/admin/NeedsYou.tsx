"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardTask } from "@/lib/dashboard-model";
import { ADMIN_STATUS_CHANGED_EVENT } from "./admin-events";
import styles from "./dashboard.module.css";

type NeedsYouProps = {
  tasks: DashboardTask[];
  moreTasks: { messages: number; bookings: number };
};

type Toast = { text: string; tone: "done" | "error"; undo?: () => void } | null;

type InboxPatch = { status?: string; bookingStatus?: string };

const KIND_LABEL: Record<DashboardTask["kind"], string> = {
  booking: "Booking request",
  message: "New message",
  health: "Site Health",
  seo: "Search",
  media: "Media",
  design: "Design",
};

const LINK_ACTION: Partial<Record<DashboardTask["kind"], string>> = {
  health: "Open Site Health",
  seo: "Fix in SEO",
  media: "Add alt text",
  design: "Review draft",
};

async function patchSubmission(id: string, body: InboxPatch): Promise<void> {
  const res = await fetch(`/api/admin/forms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
}

export default function NeedsYou({ tasks, moreTasks }: NeedsYouProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showToast(next: Toast) {
    window.clearTimeout(toastTimer.current);
    setToast(next);
    if (next) toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }

  function hide(id: string, value: boolean) {
    setHidden((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function afterChange() {
    window.dispatchEvent(new Event(ADMIN_STATUS_CHANGED_EVENT));
    router.refresh();
  }

  async function run(task: DashboardTask, change: InboxPatch, revert: InboxPatch, doneText: string) {
    const id = task.submissionId;
    if (!id || busy) return;
    setBusy(task.id);
    hide(task.id, true);
    try {
      await patchSubmission(id, change);
      afterChange();
      showToast({
        text: doneText,
        tone: "done",
        undo: async () => {
          showToast(null);
          try {
            await patchSubmission(id, revert);
            hide(task.id, false);
            afterChange();
          } catch {
            showToast({ text: "Couldn't undo. Open the message in Inbox to change it.", tone: "error" });
          }
        },
      });
    } catch {
      hide(task.id, false);
      showToast({ text: "Couldn't save the change. Check your connection and try again.", tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  function wasNew(task: DashboardTask) {
    return task.submissionStatus === "new";
  }

  const visible = tasks.filter((task) => !hidden.has(task.id));
  const moreCount = moreTasks.messages + moreTasks.bookings;

  return (
    <section className={`sa-card ${styles.needs}`} aria-labelledby="needs-you-title">
      <div className="sa-card__header">
        <div>
          <span className="sa-card__eyebrow">Today</span>
          <h2 id="needs-you-title" className={styles.needsTitle}>
            Needs you <span className={styles.count}>{visible.length}</span>
          </h2>
        </div>
        <span className={styles.sortNote}>{visible.length ? "Sorted by urgency" : "All clear"}</span>
      </div>

      {visible.length ? (
        <ul className={styles.tasks}>
          {visible.map((task) => {
            const name = task.kind === "booking" ? task.title.replace(/ wants to book$/, "") : task.title;
            return (
              <li key={task.id} className={`${styles.task} ${styles[`tone_${task.tone}`]}`}>
                <span className={styles.stripe} aria-hidden="true" />
                <div className={styles.taskCopy}>
                  <span className={styles.kind}>{KIND_LABEL[task.kind]}</span>
                  <Link href={task.href} className={styles.taskTitle}>{task.title}</Link>
                  {task.detail ? <span className={styles.taskDetail}>{task.detail}</span> : null}
                </div>
                <div className={styles.actions}>
                  {task.kind === "booking" ? (
                    <>
                      <button
                        type="button"
                        className="sa-btn sa-btn--primary sa-btn--sm"
                        disabled={busy !== null}
                        onClick={() =>
                          run(
                            task,
                            { bookingStatus: "confirmed", ...(wasNew(task) ? { status: "read" } : {}) },
                            { bookingStatus: "pending", ...(wasNew(task) ? { status: "new" } : {}) },
                            `Booking from ${name} confirmed.`,
                          )
                        }
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost sa-btn--sm"
                        disabled={busy !== null}
                        onClick={() =>
                          run(
                            task,
                            { bookingStatus: "declined", ...(wasNew(task) ? { status: "read" } : {}) },
                            { bookingStatus: "pending", ...(wasNew(task) ? { status: "new" } : {}) },
                            `Booking from ${name} declined.`,
                          )
                        }
                      >
                        Decline
                      </button>
                    </>
                  ) : task.kind === "message" ? (
                    <>
                      <Link className="sa-btn sa-btn--primary sa-btn--sm" href={task.href}>Open</Link>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost sa-btn--sm"
                        disabled={busy !== null}
                        onClick={() => run(task, { status: "read" }, { status: "new" }, `Message from ${name} marked as read.`)}
                      >
                        Mark read
                      </button>
                    </>
                  ) : (
                    <Link className="sa-btn sa-btn--ghost sa-btn--sm" href={task.href}>{LINK_ACTION[task.kind] ?? "Open"}</Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.allClear}>
          <strong>Nothing needs you right now.</strong>
          <span>New enquiries, booking requests and site problems show up here.</span>
        </div>
      )}

      {moreCount ? (
        <p className={styles.moreNote}>
          {moreTasks.bookings ? <Link href="/admin/bookings">{moreTasks.bookings} more booking requests</Link> : null}
          {moreTasks.bookings && moreTasks.messages ? " · " : null}
          {moreTasks.messages ? <Link href="/admin/forms">{moreTasks.messages} more new messages</Link> : null}
        </p>
      ) : null}

      {toast ? (
        <div className={`${styles.toast} ${toast.tone === "error" ? styles.toastError : ""}`} role="status">
          <span>{toast.text}</span>
          {toast.undo ? (
            <button type="button" onClick={toast.undo}>
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
