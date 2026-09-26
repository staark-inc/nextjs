import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function contentDir(): string {
  const dir = process.env.STAARK_CONTENT_DIR?.trim() || "content";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const dir = contentDir();
  const site = JSON.parse(await readFile(path.join(dir, "site.json"), "utf8"));
  const files = (await readdir(path.join(dir, "pages"))).filter((f) => f.endsWith(".json"));

  let submissionCount = 0;
  try {
    const sub = await readFile(path.join(process.cwd(), ".staark", "submissions.jsonl"), "utf8");
    submissionCount = sub.trim().split("\n").filter(Boolean).length;
  } catch {}

  const theme = process.env.STAARK_THEME ?? "light";
  const source = process.env.STAARK_CONTENT_SOURCE ?? "fixtures";

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <span>Overview</span>
      </div>

      <h1 className="sa-h1">Welcome back</h1>
      <p className="sa-subtitle">{site.name} &mdash; {site.tagline}</p>

      <div className="sa-stats">
        <div className="sa-stat">
          <div className="sa-stat__label">Theme</div>
          <div className="sa-stat__value sa-stat__value--sm">{theme}</div>
          <div className="sa-stat__desc">Active theme</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Pages</div>
          <div className="sa-stat__value">{files.length}</div>
          <div className="sa-stat__desc">Published pages</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Inbox</div>
          <div className="sa-stat__value">{submissionCount}</div>
          <div className="sa-stat__desc">{submissionCount === 0 ? "No submissions" : `${submissionCount} total`}</div>
        </div>
        <div className="sa-stat">
          <div className="sa-stat__label">Preset</div>
          <div className="sa-stat__value sa-stat__value--sm">{site.theme?.preset ?? "default"}</div>
          <div className="sa-stat__desc">Active preset</div>
        </div>
      </div>

      <div className="sa-accent-card">
        <div className="sa-accent-card__label">Content source</div>
        <div className="sa-accent-card__title">
          {source === "fixtures" ? "Local fixtures" : "Staark Hub"}
        </div>
        <div className="sa-accent-card__desc">
          {source === "fixtures"
            ? "Serving content from local JSON files. Changes are instant — edit files or use the admin panel."
            : "Connected to Staark Hub. Content syncs automatically."}
        </div>
        <div className="sa-accent-card__meta">
          <span>Directory: {process.env.STAARK_CONTENT_DIR ?? "content"}</span>
          <span>Mode: Development</span>
        </div>
      </div>

      <div className="sa-card">
        <h3>Pages</h3>
        <ul className="sa-page-list">
          {files.map((file) => (
            <li key={file}>
              <a href={`/admin/pages/${file}`}>{file.replace(".json", "")}</a>
              <span className="sa-path">{file}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sa-card">
        <h3>Quick actions</h3>
        <div className="sa-quick-actions">
          <a href="/admin/themes" className="sa-quick-action">
            <div className="sa-quick-action__icon">🎨</div>
            <div className="sa-quick-action__label">Themes</div>
          </a>
          <a href="/admin/pages" className="sa-quick-action">
            <div className="sa-quick-action__icon">📄</div>
            <div className="sa-quick-action__label">Pages</div>
          </a>
          <a href="/admin/forms" className="sa-quick-action">
            <div className="sa-quick-action__icon">✉️</div>
            <div className="sa-quick-action__label">Inbox</div>
          </a>
          <a href="/admin/site" className="sa-quick-action">
            <div className="sa-quick-action__icon">⚙️</div>
            <div className="sa-quick-action__label">Settings</div>
          </a>
          <a href="/" target="_blank" rel="noopener" className="sa-quick-action">
            <div className="sa-quick-action__icon">🌐</div>
            <div className="sa-quick-action__label">View site</div>
          </a>
        </div>
      </div>
    </>
  );
}
