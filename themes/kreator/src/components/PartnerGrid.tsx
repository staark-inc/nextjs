"use client";

import { useState } from "react";
import { CopyCode } from "./CopyCode";

export type Partner = {
  name: string;
  offer?: string;
  description?: string;
  code?: string;
  href: string;
  category: string;
  logo?: { src: string; alt: string };
  featured: boolean;
  cardStyle?: "standard" | "promo" | "artwork" | "cover";
  background?: { src: string; alt: string };
  backgroundPosition?: "center" | "top" | "bottom";
  imageFit?: "natural" | "cover" | "contain";
  overlay?: "none" | "soft" | "dark";
  promoContent?: "actions" | "full";
};

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Partner cards with category filters. Links are marked rel="sponsored" as
 * search engines expect for affiliate links.
 */
export function PartnerGrid({ partners, allLabel, linkLabel, copyLabel, copiedLabel }: { partners: Partner[]; allLabel: string; linkLabel: string; copyLabel: string; copiedLabel: string }) {
  const categories = Array.from(new Set(partners.map((p) => p.category).filter(Boolean)));
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? partners.filter((p) => p.category === filter) : partners;

  return (
    <div className="sk-kr-partners">
      {categories.length > 1 ? (
        <div className="sk-kr-filters" role="group" aria-label="Filtrează">
          {[null, ...categories].map((cat) => (
            <button key={cat ?? "all"} type="button" aria-pressed={filter === cat} onClick={() => setFilter(cat)}>
              {cat ?? allLabel}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="sk-kr-partners__grid">
        {visible.map((p) => {
          const hasArtwork = Boolean(p.background?.src);
          const artwork =
            hasArtwork &&
            (p.cardStyle === "artwork" || p.cardStyle === "promo");
          const cover =
            hasArtwork &&
            p.cardStyle === "cover";
          const promo = artwork || cover;
          const actionsOnly =
            artwork || (cover && p.promoContent !== "full");

          return (
            <li
              key={p.name}
              className={[
                "sk-kr-partner",
                p.featured ? "sk-kr-partner--featured" : "",
                promo ? "sk-kr-partner--promo" : "",
                artwork ? "sk-kr-partner--artwork" : "",
                cover ? "sk-kr-partner--cover" : "",
                actionsOnly ? "sk-kr-partner--promo-actions" : "",
              ].filter(Boolean).join(" ")}
              data-overlay={promo ? p.overlay ?? "dark" : undefined}
            >
              {promo && p.background ? (
                <div
                  className="sk-kr-partner__media"
                  data-fit={p.imageFit ?? (artwork ? "natural" : "cover")}
                  aria-hidden={actionsOnly || undefined}
                >
                  <img
                    src={p.background.src}
                    alt={actionsOnly ? "" : (p.background.alt || p.name)}
                    loading="lazy"
                    style={{
                      objectPosition: p.backgroundPosition ?? "center",
                    }}
                  />
                  <span className="sk-kr-partner__overlay" />
                </div>
              ) : null}

              <div className="sk-kr-partner__content">
                {actionsOnly ? (
                  <span className="sk-kr-sr">
                    {p.name}{p.offer ? ` — ${p.offer}` : ""}{p.description ? ` — ${p.description}` : ""}
                  </span>
                ) : (
                  <>
                    <div className="sk-kr-partner__top">
                      <span className="sk-kr-partner__logo" aria-hidden={!p.logo}>
                        {p.logo ? <img src={p.logo.src} alt={p.logo.alt || p.name} loading="lazy" /> : monogram(p.name)}
                      </span>
                      <span className="sk-kr-partner__meta">
                        <strong>{p.name}</strong>
                        {p.category ? <span>{p.category}</span> : null}
                      </span>
                    </div>
                    {p.offer ? <p className="sk-kr-partner__offer">{p.offer}</p> : null}
                    {p.description ? <p className="sk-kr-partner__desc">{p.description}</p> : null}
                  </>
                )}

                <div className="sk-kr-partner__actions">
                  {p.code ? <CopyCode code={p.code} copyLabel={copyLabel} copiedLabel={copiedLabel} /> : null}
                  <a className="sk-kr-partner__link" href={p.href} target="_blank" rel="sponsored noopener">
                    {linkLabel}
                    <span aria-hidden> ↗</span>
                    <span className="sk-kr-sr"> ({p.name})</span>
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
