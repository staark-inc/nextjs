import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import LogoutLink from "./LogoutLink";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staark Admin", robots: "noindex" };

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  themes: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  settings: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
  pages: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  forms: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z M12 11h4 M12 16h4 M8 11h.01 M8 16h.01",
  media: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M17.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M21 15l-3.09-3.09a2 2 0 0 0-2.82 0L6 21",
  seo: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {children}
      </>
    );
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="sa-shell">
        <nav className="sa-sidebar">
          <div className="sa-sidebar__brand">
            <span className="sa-logo">S</span>
            <div>
              <strong>Staark</strong>
              <span className="sa-sidebar__label">Admin</span>
            </div>
          </div>
          <ul className="sa-nav">
            <li><a href="/admin"><Icon d={icons.dashboard} /> Dashboard</a></li>
            <li><a href="/admin/themes"><Icon d={icons.themes} /> Themes</a></li>
            <li><a href="/admin/pages"><Icon d={icons.pages} /> Pages</a></li>
            <li><a href="/admin/media"><Icon d={icons.media} /> Media</a></li>
            <li><a href="/admin/seo"><Icon d={icons.seo} /> SEO</a></li>
            <li><a href="/admin/forms"><Icon d={icons.forms} /> Inbox</a></li>
            <li><a href="/admin/site"><Icon d={icons.settings} /> Settings</a></li>
          </ul>
          <div className="sa-sidebar__user">
            <div className="sa-sidebar__avatar">{(session.username ?? "A")[0]!.toUpperCase()}</div>
            <div>
              <strong>{session.username ?? "Admin"}</strong>
              <span className="sa-sidebar__label">Administrator</span>
            </div>
          </div>
          <div className="sa-sidebar__footer">
            <a href="/" target="_blank" rel="noopener"><Icon d={icons.external} size={14} /> View site</a>
            <LogoutLink><Icon d={icons.logout} size={14} /> Log out</LogoutLink>
          </div>
        </nav>
        <main className="sa-main">{children}</main>
      </div>
    </>
  );
}
