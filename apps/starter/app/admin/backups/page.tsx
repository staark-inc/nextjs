"use client";

import { useEffect, useState } from "react";
import styles from "./backups.module.css";

type Backup = {
  id: string;
  label: string;
  createdAt: string;
  includeUploads: boolean;
  totalBytes: number;
  fileCount: number;
  includesRevisions: boolean;
  includesRedirects: boolean;
};

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [label, setLabel] = useState("");
  const [includeUploads, setIncludeUploads] = useState(true);
  const [working, setWorking] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    const res = await fetch("/api/admin/backups", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not load backups.", false);
      return;
    }
    setBackups((data as { backups?: Backup[] }).backups ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setWorking("create");
    const res = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim() || "Manual backup",
        includeUploads,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not create backup.", false);
      return;
    }

    setLabel("");
    showToast("Backup created.", true);
    await load();
  }

  async function restore(backup: Backup) {
    if (!confirm(
      `Restore "${backup.label}"?\n\nStaark will first create a safety backup of the current deployment.`,
    )) return;

    setWorking(`restore:${backup.id}`);
    const res = await fetch(`/api/admin/backups/${backup.id}/restore`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Restore failed.", false);
      return;
    }

    const safety = (data as { safetyBackup?: Backup }).safetyBackup;
    showToast(
      safety
        ? `Restored. Safety backup created: ${safety.label}`
        : "Backup restored.",
      true,
    );
    await load();
  }

  async function remove(backup: Backup) {
    if (!confirm(`Delete backup "${backup.label}"? This cannot be undone.`)) return;

    setWorking(`delete:${backup.id}`);
    const res = await fetch(`/api/admin/backups/${backup.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setWorking("");

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not delete backup.", false);
      return;
    }

    showToast("Backup deleted.", true);
    await load();
  }

  return (
    <>
      <section className="sa-page-header">
        <div>
          <span className="sa-page-eyebrow">Recovery</span>
          <h1 className="sa-h1">Backup & Restore</h1>
          <p className="sa-subtitle">
            Snapshot content, Theme Studio, revisions, redirects and local admin state before risky changes.
          </p>
        </div>
      </section>

      <section className={`sa-card ${styles.create}`}>
        <div>
          <span className="sa-card__eyebrow">Create recovery point</span>
          <h2>Save the current deployment state</h2>
          <p>
            Revisions and redirects are always included. Uploads are optional because they can make snapshots much larger.
          </p>
        </div>

        <div className={styles.createControls}>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Before homepage rewrite"
            maxLength={120}
            aria-label="Backup label"
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={includeUploads}
              onChange={(event) => setIncludeUploads(event.target.checked)}
            />
            Include uploads
          </label>
          <button
            className="sa-btn sa-btn--primary"
            type="button"
            onClick={() => void create()}
            disabled={Boolean(working)}
          >
            {working === "create" ? "Creating…" : "Create backup"}
          </button>
        </div>
      </section>

      <section className={`sa-card ${styles.listCard}`}>
        <div className="sa-card__header">
          <div>
            <span className="sa-card__eyebrow">Recovery points</span>
            <h2>{backups.length} backup{backups.length === 1 ? "" : "s"}</h2>
          </div>
        </div>

        {backups.length ? (
          <div className={styles.list}>
            {backups.map((backup) => (
              <article className={styles.row} key={backup.id}>
                <div className={styles.copy}>
                  <strong>{backup.label}</strong>
                  <span>
                    {new Date(backup.createdAt).toLocaleString()} · {backup.fileCount} files · {size(backup.totalBytes)}
                  </span>
                  <small>
                    {backup.includeUploads ? "Uploads included" : "Uploads excluded"}
                    {" · "}
                    {backup.includesRevisions ? "revisions included" : "legacy snapshot without revisions"}
                    {" · "}
                    {backup.includesRedirects ? "redirects included" : "legacy snapshot without redirects"}
                  </small>
                </div>

                <div className={styles.actions}>
                  <a
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    href={`/api/admin/backups/${backup.id}/download`}
                  >
                    Download
                  </a>
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    type="button"
                    onClick={() => void restore(backup)}
                    disabled={Boolean(working)}
                  >
                    {working === `restore:${backup.id}` ? "Restoring…" : "Restore"}
                  </button>
                  <button
                    className="sa-btn sa-btn--danger sa-btn--sm"
                    type="button"
                    onClick={() => void remove(backup)}
                    disabled={Boolean(working)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sa-empty">
            <div className="sa-empty__title">No backups yet</div>
            <div className="sa-empty__desc">
              Create a recovery point before the next structural content or design change.
            </div>
          </div>
        )}
      </section>

      {toast ? (
        <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>
          {toast.msg}
        </div>
      ) : null}
    </>
  );
}
