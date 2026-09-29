"use client";

import { useId, useState } from "react";
import { computeDeduction, formatKr, type DeductionKind } from "../deduction";

export type DeductionOption = { label: string; kind: DeductionKind; rate: number; defaultLabor: number; defaultMaterial: number };

export function DeductionWidget({ options, capPerPerson, maxAmount, step }: { options: DeductionOption[]; capPerPerson: number; maxAmount: number; step: number }) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const option = options[index] ?? options[0]!;
  const [labor, setLabor] = useState(option.defaultLabor);
  const [material, setMaterial] = useState(option.defaultMaterial);
  const [persons, setPersons] = useState<1 | 2>(1);

  function choose(i: number) {
    setIndex(i);
    setLabor(options[i]!.defaultLabor);
    setMaterial(options[i]!.defaultMaterial);
  }

  const r = computeDeduction({ kind: option.kind, ratePercent: option.rate, capPerPerson, labor, material, persons });
  const label = option.kind === "green" ? `Grön teknik ${option.rate} %` : `ROT ${option.rate} %`;

  return (
    <div className="sk-el-calc__card">
      <div className="sk-el-calc__options" role="radiogroup" aria-label="Typ av jobb">
        {options.map((o, i) => (
          <button key={o.label} type="button" role="radio" aria-checked={i === index} onClick={() => choose(i)}>
            {o.label}
          </button>
        ))}
      </div>

      <p className="sk-el-calc__rule">
        <strong>{label}</strong> {option.kind === "green" ? "på arbete och material" : "på arbetskostnaden"}
      </p>

      <div className="sk-el-calc__field">
        <div className="sk-el-calc__row">
          <label htmlFor={`${id}-labor`}>Arbete</label>
          <output htmlFor={`${id}-labor`}>{formatKr(labor)}</output>
        </div>
        <input id={`${id}-labor`} type="range" min={0} max={maxAmount} step={step} value={labor} onChange={(e) => setLabor(Number(e.target.value))} />
      </div>
      <div className="sk-el-calc__field">
        <div className="sk-el-calc__row">
          <label htmlFor={`${id}-mat`}>Material</label>
          <output htmlFor={`${id}-mat`}>{formatKr(material)}</output>
        </div>
        <input id={`${id}-mat`} type="range" min={0} max={maxAmount} step={step} value={material} onChange={(e) => setMaterial(Number(e.target.value))} />
      </div>

      <fieldset className="sk-el-calc__persons">
        <legend>Antal som delar avdraget</legend>
        <div className="sk-el-segment">
          {([1, 2] as const).map((n) => (
            <button key={n} type="button" aria-pressed={persons === n} onClick={() => setPersons(n)}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <dl className="sk-el-calc__sum">
        <div>
          <dt>Totalt före avdrag</dt>
          <dd>{formatKr(r.total)}</dd>
        </div>
        <div className="sk-el-calc__deduction">
          <dt>Avdrag</dt>
          <dd>− {formatKr(r.deduction)}</dd>
        </div>
      </dl>
      {r.capped ? <p className="sk-el-calc__capped">Avdraget är begränsat av maxbeloppet.</p> : null}
      <div className="sk-el-calc__pay" aria-live="polite">
        <span>Du betalar</span>
        <strong>{formatKr(r.pay)}</strong>
      </div>
    </div>
  );
}
