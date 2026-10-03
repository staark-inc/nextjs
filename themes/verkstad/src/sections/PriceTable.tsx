import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead } from "../components/shared";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  /** Column headings for the price columns, e.g. ["Småbil", "Mellanklass", "SUV / stor"]. */
  columns: z.array(z.string()).min(1).default(["Pris"]),
  groups: z
    .array(
      z.object({
        title: z.string(),
        rows: z.array(z.object({ name: z.string(), note: z.string().optional(), prices: z.array(z.string()).default([]) })).default([]),
      }),
    )
    .default([]),
  footnote: z.string().optional(),
  /** Where the per-row "Boka" link goes; the service name is added as ?tjanst=. Empty hides the links. */
  bookHref: z.string().default("#boka"),
  bookLabel: z.string().default("Boka"),
});

function withParam(href: string, key: string, value: string): string {
  const [path, hash] = href.split("#");
  const sep = path!.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}${hash !== undefined ? `#${hash}` : ""}`;
}

/**
 * Price table — fixed prices per car size, grouped (Service, Däck, Bromsar, AC).
 * A real <table> on desktop; each row stacks into a card on phones.
 * Block type: "priceTable".
 */
export const PriceTable: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-vk-prices" id="priser">
      <Container>
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        {p.groups.map((group) => (
          <div key={group.title} className="sk-vk-prices__group">
            <table className="sk-vk-table">
              <caption>{group.title}</caption>
              <thead>
                <tr>
                  <th scope="col">Tjänst</th>
                  {p.columns.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                  {p.bookHref ? (
                    <th scope="col">
                      <span className="sk-vk-sr">Boka</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">
                      <span className="sk-vk-table__name">{row.name}</span>
                      {row.note ? <span className="sk-vk-table__note">{row.note}</span> : null}
                    </th>
                    {p.columns.map((col, i) => (
                      <td key={col} data-label={col}>
                        {row.prices[i] ?? row.prices[row.prices.length - 1] ?? "–"}
                      </td>
                    ))}
                    {p.bookHref ? (
                      <td className="sk-vk-table__book">
                        <a href={withParam(p.bookHref, "tjanst", row.name)} aria-label={`${p.bookLabel}: ${row.name}`}>
                          {p.bookLabel}
                        </a>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {p.footnote ? <p className="sk-vk-prices__foot">{p.footnote}</p> : null}
      </Container>
    </section>
  );
};
