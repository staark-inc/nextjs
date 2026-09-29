"use client";

import { useEffect, useId, useState } from "react";
import { withParam } from "../url";

export type MenuCategory = {
  name: string;
  note?: string;
  items: { name: string; description?: string; duration?: string; price: string; bookable: boolean }[];
};

/**
 * Tabbed service menu. Without JavaScript every panel is rendered (the tabs
 * only hide the inactive ones after hydration), so crawlers and no-JS readers
 * still see the full price list.
 */
export function MenuTabs({ categories, bookHref, bookLabel }: { categories: MenuCategory[]; bookHref: string; bookLabel: string }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  function onKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + categories.length) % categories.length;
    setActive(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="sk-sb-menu">
      {categories.length > 1 ? (
        <div className="sk-sb-tabs" role="tablist" aria-label="Kategorier">
          {categories.map((cat, i) => (
            <button
              key={cat.name}
              id={`${id}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-controls={`${id}-panel-${i}`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : null}

      {categories.map((cat, i) => (
        <div
          key={cat.name}
          id={`${id}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${i}`}
          hidden={hydrated && categories.length > 1 && active !== i}
          className="sk-sb-menu__panel"
        >
          {cat.note ? <p className="sk-sb-menu__note">{cat.note}</p> : null}
          <ul className="sk-sb-menu__list">
            {cat.items.map((item) => (
              <li key={item.name} className="sk-sb-menu__item">
                <div className="sk-sb-menu__label">
                  <span className="sk-sb-menu__name">{item.name}</span>
                  {item.description ? <span className="sk-sb-menu__desc">{item.description}</span> : null}
                </div>
                <div className="sk-sb-menu__meta">
                  {item.duration ? <span className="sk-sb-menu__dur">{item.duration}</span> : null}
                  <span className="sk-sb-menu__price">{item.price}</span>
                  {item.bookable ? (
                    <a className="sk-sb-menu__book" href={withParam(bookHref, "tjanst", item.name)} aria-label={`${bookLabel}: ${item.name}`}>
                      {bookLabel}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
