"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "./AdminIcon";
import { adminNavItems, SEARCH_ICON } from "./admin-nav";
import styles from "./AdminShell.module.css";

type Command = {
  id: string;
  section: "Pages" | "Go to" | "Actions";
  label: string;
  hint: string;
  keywords?: string;
  run: { type: "route"; href: string } | { type: "external"; href: string } | { type: "logout" };
};

type PageSummary = { file: string; path: string; title: string };

const SECTION_ORDER: Command["section"][] = ["Go to", "Pages", "Actions"];

const navCommands: Command[] = adminNavItems.map((item) => ({
  id: `nav:${item.href}`,
  section: "Go to",
  label: item.label,
  hint: item.description,
  keywords: item.keywords,
  run: { type: "route", href: item.href },
}));

const actionCommands: Command[] = [
  { id: "action:new-page", section: "Actions", label: "Create a page", hint: "Pages", keywords: "new add", run: { type: "route", href: "/admin/pages" } },
  { id: "action:backup", section: "Actions", label: "Create a backup", hint: "Backups", keywords: "snapshot save", run: { type: "route", href: "/admin/backups" } },
  { id: "action:redirect", section: "Actions", label: "Add a redirect", hint: "Redirects", keywords: "301 url", run: { type: "route", href: "/admin/redirects" } },
  { id: "action:view-site", section: "Actions", label: "View website", hint: "Opens in a new tab", keywords: "open live public", run: { type: "external", href: "/" } },
  { id: "action:logout", section: "Actions", label: "Log out", hint: "End this session", keywords: "sign out exit", run: { type: "logout" } },
];

function matches(command: Command, terms: string[]): boolean {
  const haystack = `${command.label} ${command.hint} ${command.keywords ?? ""}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function rank(command: Command, query: string): number {
  const label = command.label.toLowerCase();
  if (label.startsWith(query)) return 0;
  if (label.includes(query)) return 1;
  return 2;
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [pagesFailed, setPagesFailed] = useState(false);

  // Focus the input on open; give focus back to whatever had it on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pages", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { pages?: PageSummary[] }) => {
        if (!cancelled) setPages(Array.isArray(data.pages) ? data.pages : []);
      })
      .catch(() => {
        if (!cancelled) setPagesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageCommands = useMemo<Command[]>(
    () =>
      (pages ?? []).map((page) => ({
        id: `page:${page.file}`,
        section: "Pages",
        label: page.title,
        hint: page.path,
        keywords: `edit page ${page.file}`,
        run: { type: "route", href: `/admin/pages/${encodeURIComponent(page.file)}` },
      })),
    [pages],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...navCommands, ...pageCommands.slice(0, 6), ...actionCommands];
    }
    const terms = q.split(/\s+/);
    const found = [...navCommands, ...pageCommands, ...actionCommands].filter((command) => matches(command, terms));
    return found
      .map((command, index) => ({ command, index, score: rank(command, q) }))
      .sort(
        (a, b) =>
          SECTION_ORDER.indexOf(a.command.section) - SECTION_ORDER.indexOf(b.command.section) ||
          a.score - b.score ||
          a.index - b.index,
      )
      .map((item) => item.command)
      .slice(0, 20);
  }, [query, pageCommands]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  async function run(command: Command) {
    const action = command.run;
    if (action.type === "route") {
      onClose();
      router.push(action.href);
    } else if (action.type === "external") {
      onClose();
      window.open(action.href, "_blank", "noopener,noreferrer");
    } else {
      await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
      window.location.assign("/admin/login");
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = results[active];
      if (command) void run(command);
    } else if (event.key === "Tab") {
      // Keep focus inside the dialog; arrows move through results.
      event.preventDefault();
    }
  }

  let lastSection: Command["section"] | null = null;

  return (
    <div
      className={styles.paletteBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.palette} role="dialog" aria-modal="true" aria-label="Search the admin" onKeyDown={onKeyDown}>
        <div className={styles.paletteSearch}>
          <AdminIcon d={SEARCH_ICON} size={17} />
          <input
            ref={inputRef}
            id="admin-command-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, sections and actions"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-command-results"
            aria-activedescendant={results[active] ? `admin-command-${active}` : undefined}
          />
          <kbd className={styles.kbdLight}>Esc</kbd>
        </div>

        <ul className={styles.paletteList} id="admin-command-results" role="listbox" ref={listRef}>
          {results.map((command, index) => {
            const header = command.section !== lastSection ? command.section : null;
            lastSection = command.section;
            return (
              <li key={command.id} role="presentation">
                {header ? <div className={styles.paletteSection} role="presentation">{header}</div> : null}
                <div
                  id={`admin-command-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  className={styles.paletteItem}
                  onMouseMove={() => setActive(index)}
                  onClick={() => void run(command)}
                >
                  <span>{command.label}</span>
                  <small>{command.hint}</small>
                </div>
              </li>
            );
          })}
          {!results.length ? (
            <li className={styles.paletteEmpty}>No matches for “{query.trim()}”. Try a page name or a section like SEO.</li>
          ) : null}
        </ul>

        <div className={styles.paletteFooter}>
          <span>↑↓ move · Enter open · Esc close</span>
          {pages === null && !pagesFailed ? <span>Loading pages…</span> : null}
          {pagesFailed ? <span>Pages couldn't be loaded</span> : null}
        </div>
      </div>
    </div>
  );
}
