"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./revisions.module.css";

type Revision = {
  id: string;
  createdAt: string;
  reason: string;
  sha256: string;
  title: string;
  path: string;
  blocks: number;
};

export default function RevisionsPage() {
  const params = useParams();
  const file = params.file as string;
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [working, setWorking] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    const res = await fetch(`/api/admin/pages/${file}/revisions`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not load revisions.", false);
      return;
    }
    setRevisions((data as { revisions?: Revision[] }).revisions ?? []);
  }

  useEffect(() => { void load(); }, [file]);

  async function restore(revision: Revision) {
    if (!confirm(
      `Restore the version from ${new Date(revision.createdAt).toLocaleString()}?\n\nThe current page will be saved as another revision first.`,
    )) return;

    setWorking(revision.id);
    const res = await fetch(
      `/api/admin/pages/${file}/revisions/${revision.id}/restore`,
      { method: "POST" },
    );
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Restore failed.", false);
      return;
    }

    showToast("Revision restored. Previous current version was preserved.", true);
    await load();
  }

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a><span>/</span>
        <a href="/admin/pages">Pages</a><span>/</span>
        <a href={`/admin/pages/${file}`}>Page</a><span>/</span>
        <span>History</span>
      </div>

      <div className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Page history</span>
          <h1 className="sa-h1">Revisions</h1>
          <p className="sa-subtitle">Staark keeps the previous version automatically whenever this page changes.</p>
        </div>
        <a className="sa-btn sa-btn--ghost" href={`/admin/pages/${file}`}>Back to editor</a>
      </div>

      <section className={`sa-card ${styles.card}`}>
        {revisions.length ? (
          <div className={styles.list}>
            {revisions.map((revision, index) => (
              <article className={styles.row} key={revision.id}>
                <div className={styles.timeline}>
                  <span>{index + 1}</span>
                  {index < revisions.length - 1 ? <i /> : null}
                </div>
                <div className={styles.copy}>
                  <strong>{revision.title}</strong>
                  <span>{revision.path || "No path"} · {revision.blocks} block{revision.blocks === 1 ? "" : "s"}</span>
                  <small>{new Date(revision.createdAt).toLocaleString()} · {revision.reason}</small>
                </div>
                <code>{revision.sha256.slice(0, 8)}</code>
                <button
                  className="sa-btn sa-btn--ghost sa-btn--sm"
                  onClick={() => void restore(revision)}
                  disabled={Boolean(working)}
                >
                  {working === revision.id ? "Restoring…" : "Restore"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">No revisions yet</div>
            <div className="sa-empty__desc">Edit and save the page once; the previous version will appear here.</div>
          </div>
        )}
      </section>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
