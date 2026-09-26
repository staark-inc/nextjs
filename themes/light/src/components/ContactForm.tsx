"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Client form that talks to the site's own /api/staark/forms route (built from
 * @staark/core createFormsRoute), which forwards to S-Hub Inbox on the Hub.
 *
 * The time-trap token is fetched on mount from GET /api/staark/forms?form=<id>,
 * so the page hosting the form can stay static/ISR.
 */

export type FieldDef = { name: string; label: string; type?: "text" | "email" | "tel" | "textarea" | "date" | "time" | "number"; required?: boolean; placeholder?: string };

export type ContactFormProps = {
  formId: string;
  endpoint?: string;
  fields: FieldDef[];
  submitLabel: string;
  successMessage?: string;
};

type State = { status: "idle" | "loading" | "ok" | "error"; message?: string; fieldErrors?: Record<string, string> };

export function ContactForm({ formId, endpoint = "/api/staark/forms", fields, submitLabel, successMessage }: ContactFormProps) {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    fetch(`${endpoint}?form=${encodeURIComponent(formId)}`, { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((d: { token?: string }) => active && d.token && setToken(d.token))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endpoint, formId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setState({ status: "loading" });
    const form = event.currentTarget;
    const data = new FormData(form);
    const knownNumbers = new Set(["booking_guests"]);
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = data.get(field.name);
      if (raw == null || raw === "") continue;
      values[field.name] = knownNumbers.has(field.name) ? Number(raw) : String(raw);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formId, token, website: String(data.get("website") ?? ""), fields: values, pageUrl: location.href }),
    });
    const body: { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } = await res.json();

    if (body.ok) {
      setState({ status: "ok", message: body.message ?? successMessage });
      form.reset();
    } else {
      setState({ status: "error", message: body.error, fieldErrors: body.fieldErrors });
    }
  }

  if (state.status === "ok") {
    return (
      <div className="sk-form__success" role="status">
        {state.message ?? "Tack! Vi återkommer så snart vi kan."}
      </div>
    );
  }

  return (
    <form ref={formRef} className="sk-form" onSubmit={onSubmit} noValidate>
      {/* Honeypot: hidden from users, tempting to bots. */}
      <div aria-hidden className="sk-form__hp">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {fields.map((field) => (
        <label key={field.name} className={`sk-field${field.type === "textarea" ? " sk-field--wide" : ""}`}>
          <span>
            {field.label}
            {field.required ? <em aria-hidden> *</em> : null}
          </span>
          {field.type === "textarea" ? (
            <textarea name={field.name} required={field.required} placeholder={field.placeholder} rows={5} />
          ) : (
            <input type={field.type ?? "text"} name={field.name} required={field.required} placeholder={field.placeholder} />
          )}
          {state.fieldErrors?.[field.name] ? <small className="sk-field__error">{state.fieldErrors[field.name]}</small> : null}
        </label>
      ))}

      {state.status === "error" && state.message ? (
        <p className="sk-form__error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="sk-btn sk-btn--primary" disabled={state.status === "loading" || !token}>
        {state.status === "loading" ? "Skickar…" : submitLabel}
      </button>
    </form>
  );
}
