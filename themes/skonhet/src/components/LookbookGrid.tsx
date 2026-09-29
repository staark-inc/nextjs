"use client";

import { useState } from "react";

export type LookItem = { src: string; alt: string; category: string; caption?: string };

/** Filterable lookbook grid. Plain <img> keeps it host-agnostic inside a client component. */
export function LookbookGrid({ items, allLabel }: { items: LookItem[]; allLabel: string }) {
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <div className="sk-sb-look">
      {categories.length > 1 ? (
        <div className="sk-sb-filters" role="group" aria-label="Filtrera">
          {[null, ...categories].map((cat) => (
            <button key={cat ?? "all"} type="button" aria-pressed={filter === cat} onClick={() => setFilter(cat)}>
              {cat ?? allLabel}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="sk-sb-look__grid">
        {visible.map((item, i) => (
          <li key={`${item.src}-${i}`} className="sk-sb-look__item">
            <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
            {item.caption ? <span className="sk-sb-look__caption">{item.caption}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
