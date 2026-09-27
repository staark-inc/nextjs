"use client";

import { createContext, useContext, useState } from "react";
import { BLOCK_FIELDS, isScalarWrapper, validateBlock, type Field, type FieldError } from "@/lib/block-fields";
import { MediaPicker } from "./MediaPicker";

export { validateBlock };
export type { FieldError };

/** True if a block type has a generated form (otherwise the editor uses JSON). */
export function hasFieldForm(type: string): boolean {
  return Boolean(BLOCK_FIELDS[type]);
}

type Obj = Record<string, unknown>;

const PickerCtx = createContext<(cb: (url: string) => void) => void>(() => {});

function setKey(obj: Obj, key: string, value: unknown): Obj {
  const next = { ...obj };
  if (value === "" || value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

export function BlockFieldForm({
  type,
  value,
  onChange,
  errors,
}: {
  type: string;
  value: Obj;
  onChange: (next: Obj) => void;
  errors?: FieldError[];
}) {
  const fields = BLOCK_FIELDS[type];
  const [pickerCb, setPickerCb] = useState<((url: string) => void) | null>(null);
  if (!fields) return null;

  const errorFor = (name: string) => errors?.find((e) => e.field === name)?.message;

  return (
    <PickerCtx.Provider value={(cb) => setPickerCb(() => cb)}>
      <div className="sa-bf">
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={value?.[field.name]}
            error={errorFor(field.name)}
            onChange={(v) => onChange(setKey(value ?? {}, field.name, v))}
          />
        ))}
      </div>
      {pickerCb ? (
        <MediaPicker
          onPick={(url) => pickerCb(url)}
          onClose={() => setPickerCb(null)}
        />
      ) : null}
    </PickerCtx.Provider>
  );
}

function labelFor(field: Field, item: unknown, index: number): string {
  const tmpl = field.itemLabel;
  if (tmpl && item && typeof item === "object") {
    const filled = tmpl.replace(/\{(\w+)\}/g, (_, k) => String((item as Obj)[k] ?? "")).trim();
    if (filled) return filled;
  }
  if (tmpl === "{value}" && typeof item === "string" && item) return item;
  return `Item ${index + 1}`;
}

function FieldInput({ field, value, onChange, error }: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const openPicker = useContext(PickerCtx);
  const id = `bf-${field.name}-${Math.random().toString(36).slice(2, 7)}`;
  const errorNode = error ? <div className="sa-field-error">{error}</div> : null;

  if (field.type === "array") {
    const arr: unknown[] = Array.isArray(value) ? value : [];
    const scalar = isScalarWrapper(field.fields);
    const move = (i: number, d: -1 | 1) => {
      const t = i + d;
      if (t < 0 || t >= arr.length) return;
      const copy = [...arr];
      [copy[i], copy[t]] = [copy[t], copy[i]];
      onChange(copy);
    };
    const blank = scalar ? "" : Object.fromEntries((field.fields ?? []).map((f) => [f.name, f.type === "boolean" ? false : ""]));
    return (
      <div className="sa-field">
        <label>{field.label}</label>
        {field.help ? <div className="sa-field-hint">{field.help}</div> : null}
        <div className="sa-bf-list">
          {arr.map((item, i) =>
            scalar ? (
              <div key={i} className="sa-bf-item" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={String(item ?? "")} onChange={(e) => { const c = [...arr]; c[i] = e.target.value; onChange(c); }} style={{ flex: 1 }} />
                <ItemControls i={i} len={arr.length} move={move} remove={() => onChange(arr.filter((_, j) => j !== i))} />
              </div>
            ) : (
              <details key={i} className="sa-bf-item">
                <summary className="sa-bf-item__summary">
                  <span>{labelFor(field, item, i)}</span>
                  <ItemControls i={i} len={arr.length} move={move} remove={() => onChange(arr.filter((_, j) => j !== i))} />
                </summary>
                <div className="sa-bf-item__body">
                  {(field.fields ?? []).map((sub) => (
                    <FieldInput
                      key={sub.name}
                      field={sub}
                      value={(item as Obj)?.[sub.name]}
                      onChange={(v) => { const c = [...arr]; c[i] = setKey((item as Obj) ?? {}, sub.name, v); onChange(c); }}
                    />
                  ))}
                </div>
              </details>
            ),
          )}
        </div>
        <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onChange([...arr, structuredClone(blank)])}>
          + Add {field.label.replace(/s$/, "").toLowerCase()}
        </button>
        {errorNode}
      </div>
    );
  }

  if (field.type === "object" || field.type === "image" || field.type === "link") {
    const subFields: Field[] =
      field.type === "image"
        ? [{ name: "src", label: "Image URL", type: "imageUrl" }, { name: "alt", label: "Alt text", type: "text" }]
        : field.type === "link"
          ? [{ name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" }]
          : field.fields ?? [];
    const obj = (value as Obj) ?? {};
    return (
      <div className="sa-field">
        <label>{field.label}</label>
        <div className="sa-bf-group">
          {subFields.map((sub) => (
            <FieldInput key={sub.name} field={sub} value={obj[sub.name]} onChange={(v) => onChange(setKey(obj, sub.name, v))} />
          ))}
        </div>
        {errorNode}
      </div>
    );
  }

  if (field.type === "imageUrl") {
    const url = String(value ?? "");
    return (
      <div className="sa-field">
        <label htmlFor={id}>{field.label}</label>
        <div className="sa-bf-image">
          {url ? <img className="sa-bf-image__thumb" src={url} alt="" /> : <div className="sa-bf-image__thumb sa-bf-image__thumb--empty">🖼</div>}
          <input id={id} value={url} placeholder="/uploads/… or https://…" onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
          <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => openPicker(onChange)}>Choose</button>
          {url ? <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onChange("")}>Clear</button> : null}
        </div>
        {field.help ? <div className="sa-field-hint">{field.help}</div> : null}
        {errorNode}
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="sa-bf-toggle">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    const opts = field.options ?? [];
    return (
      <div className="sa-field">
        <label htmlFor={id}>{field.label}</label>
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) => {
            const raw = e.target.value;
            const match = opts.find((o) => String(typeof o === "object" ? o.value : o) === raw);
            const resolved = typeof match === "object" ? match.value : Number.isNaN(Number(raw)) || raw === "" ? raw : Number(raw);
            onChange(resolved);
          }}
        >
          <option value="">—</option>
          {opts.map((o) => {
            const val = typeof o === "object" ? o.value : o;
            const lab = typeof o === "object" ? o.label : String(o);
            return <option key={String(val)} value={String(val)}>{lab}</option>;
          })}
        </select>
        {errorNode}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="sa-field">
        <label htmlFor={id}>{field.label}</label>
        <input id={id} type="number" min={field.min} max={field.max} value={value === undefined || value === null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
        {field.help ? <div className="sa-field-hint">{field.help}</div> : null}
        {errorNode}
      </div>
    );
  }

  // text / textarea
  return (
    <div className="sa-field">
      <label htmlFor={id}>{field.label}</label>
      {field.type === "textarea" ? (
        <textarea id={id} value={String(value ?? "")} placeholder={field.placeholder} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} value={String(value ?? "")} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.help ? <div className="sa-field-hint">{field.help}</div> : null}
      {errorNode}
    </div>
  );
}

function ItemControls({ i, len, move, remove }: { i: number; len: number; move: (i: number, d: -1 | 1) => void; remove: () => void }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }} onClick={(e) => e.preventDefault()}>
      <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" disabled={i === 0} onClick={() => move(i, -1)}>&uarr;</button>
      <button type="button" className="sa-btn sa-btn--ghost sa-btn--sm" disabled={i === len - 1} onClick={() => move(i, 1)}>&darr;</button>
      <button type="button" className="sa-btn sa-btn--danger sa-btn--sm" onClick={remove}>&#x2715;</button>
    </span>
  );
}
