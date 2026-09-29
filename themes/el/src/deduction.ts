/**
 * Tax-deduction arithmetic for electrical work, kept pure so it can be tested.
 *
 * - "rot": ROT-avdrag, a share of the labour cost only.
 * - "green": skattereduktion för grön teknik (laddpunkt, batterilager,
 *   solceller), a share of labour + material when bought from the installer.
 *
 * Rates and caps are block props (2026: ROT 30 %, laddpunkt/batteri 50 %,
 * solceller 15 %, 50 000 kr per person and year for each), because the rules change.
 */

export type DeductionKind = "rot" | "green";

export type DeductionInput = {
  kind: DeductionKind;
  ratePercent: number;
  capPerPerson: number;
  labor: number;
  material: number;
  persons: number;
};

export type DeductionResult = { base: number; total: number; deduction: number; pay: number; capped: boolean };

const clean = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function computeDeduction(input: DeductionInput): DeductionResult {
  const labor = clean(input.labor);
  const material = clean(input.material);
  const persons = Math.max(1, Math.floor(clean(input.persons)) || 1);
  const rate = Math.min(clean(input.ratePercent), 100) / 100;
  const cap = clean(input.capPerPerson) * persons;

  const base = input.kind === "green" ? labor + material : labor;
  const uncapped = Math.round(base * rate);
  const deduction = Math.min(uncapped, cap);
  const total = labor + material;
  return { base, total, deduction, pay: total - deduction, capped: uncapped > cap };
}

const SEK = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
export function formatKr(value: number): string {
  return `${SEK.format(Math.round(value))} kr`;
}
