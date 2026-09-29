import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { DeductionWidget } from "../components/DeductionWidget";
import { formatKr } from "../deduction";

const DEFAULT_OPTIONS = [
  { label: "Laddbox", kind: "green" as const, rate: 50, defaultLabor: 6000, defaultMaterial: 12000 },
  { label: "Solceller", kind: "green" as const, rate: 15, defaultLabor: 40000, defaultMaterial: 110000 },
  { label: "Batterilager", kind: "green" as const, rate: 50, defaultLabor: 10000, defaultMaterial: 60000 },
  { label: "Övrigt elarbete", kind: "rot" as const, rate: 30, defaultLabor: 20000, defaultMaterial: 8000 },
];

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        kind: z.enum(["rot", "green"]),
        rate: z.coerce.number().min(0).max(100),
        defaultLabor: z.coerce.number().min(0).default(10000),
        defaultMaterial: z.coerce.number().min(0).default(10000),
      }),
    )
    .min(1)
    .default(DEFAULT_OPTIONS),
  /** Max deduction per person and year, in kronor (same cap for ROT and grön teknik in 2026). */
  capPerPerson: z.coerce.number().min(0).default(50000),
  maxAmount: z.coerce.number().min(10000).default(300000),
  step: z.coerce.number().min(100).default(1000),
  note: z.string().optional(),
  points: z.array(z.string()).default([]),
});

/**
 * Deduction calculator — ROT for ordinary electrical work and "grön teknik" for
 * laddbox, solceller and batterilager, with per-option rates as props.
 * Block type: "deductionCalculator".
 */
export const DeductionCalculator: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  const rule = `Max ${formatKr(p.capPerPerson)} per person och år för varje avdrag. Uppskattning, inte offert.`;
  return (
    <section className="sk-section sk-el-calc" id="avdrag">
      <Container>
        <div className="sk-el-calc__grid">
          <div className="sk-el-calc__copy">
            {p.eyebrow ? <p className="sk-el-label">{p.eyebrow}</p> : null}
            <h2>{p.heading}</h2>
            {p.intro ? <p className="sk-el-calc__intro">{p.intro}</p> : null}
            {p.points.length ? (
              <ul className="sk-el-checks">
                {p.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
            <p className="sk-el-calc__fine">{p.note ?? rule}</p>
          </div>
          <DeductionWidget options={p.options} capPerPerson={p.capPerPerson} maxAmount={p.maxAmount} step={p.step} />
        </div>
      </Container>
    </section>
  );
};

