"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Stepwise quote form. Posts to the site's /api/staark/forms route (same
 * contract as the S-Hub Light contact form), which forwards to S-Hub Inbox.
 * Only whitelisted fields are sent: the job details are composed into
 * `subject` + `message` so the Hub needs no new field types.
 */

export type QuoteFormProps = {
  formId: string;
  endpoint?: string;
  jobTypes: string[];
  timings: string[];
  submitLabel: string;
  successMessage?: string;
  consent?: string;
};

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string; fieldErrors?: Record<string, string> };

const STEPS = ["Jobb", "Detaljer", "Kontakt"] as const;

export function QuoteForm({ formId, endpoint = "/api/staark/forms", jobTypes, timings, submitLabel, successMessage, consent }: QuoteFormProps) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [job, setJob] = useState<string>("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const doneRef = useRef<HTMLDivElement>(null);

  // The success card is shorter than the form; keep it in view after submit.
  useEffect(() => {
    if (status.state === "ok") doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status.state]);

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

  // Preselect the job chosen in the hero "snabboffert" card (?jobb=Badrum).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("jobb");
    if (wanted && jobTypes.includes(wanted)) setJob(wanted);
  }, [jobTypes]);

  function stepIsValid(index: number): boolean {
    const fieldset = stepRefs.current[index];
    if (!fieldset) return true;
    const controls = Array.from(fieldset.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    const invalid = controls.find((c) => !c.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    return true;
  }

  function next() {
    if (stepIsValid(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    if (!stepIsValid(step) || !token) return;

    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const summary = [`Jobb: ${text("job")}`, `Postnummer: ${text("postcode")}`];
    if (text("timing")) summary.push(`Start: ${text("timing")}`);
    const fields: Record<string, string> = {
      name: text("name"),
      email: text("email"),
      subject: `Offertförfrågan: ${text("job")}`,
      message: `${summary.join("\n")}\n\n${text("details")}`.trim(),
    };
    if (text("phone")) fields.phone = text("phone");

    setStatus({ state: "loading" });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formId, token, website: text("website"), fields, pageUrl: location.href }),
      });
      const body: { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } = await res.json();
      if (body.ok) setStatus({ state: "ok", message: successMessage ?? body.message });
      else setStatus({ state: "error", message: body.error, fieldErrors: body.fieldErrors });
    } catch {
      setStatus({ state: "error", message: "Något gick fel. Försök igen eller ring oss." });
    }
  }

  if (status.state === "ok") {
    return (
      <div ref={doneRef} className="sk-el-quote__form sk-el-quote__done" role="status">
        <p className="sk-el-quote__title">Tack!</p>
        <p>{status.message ?? "Vi återkommer inom ett dygn."}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} className="sk-el-quote__form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="sk-form__hp">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <ol className="sk-el-progress" aria-label="Steg">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} data-done={i < step || undefined}>
            {i + 1} · {label}
          </li>
        ))}
      </ol>

      <fieldset ref={(el) => void (stepRefs.current[0] = el)} hidden={step !== 0}>
        <legend className="sk-el-quote__title">Vilken typ av jobb?</legend>
        <div className="sk-el-choices">
          {jobTypes.map((type) => (
            <label key={type} className="sk-el-choice">
              <input type="radio" name="job" value={type} required checked={job === type} onChange={() => setJob(type)} />
              <span>{type}</span>
            </label>
          ))}
        </div>
        <label className="sk-el-input">
          <span>Postnummer</span>
          <input name="postcode" inputMode="numeric" autoComplete="postal-code" placeholder="123 45" pattern="\d{3}\s?\d{2}" required />
        </label>
        {timings.length ? (
          <label className="sk-el-input">
            <span>När vill du komma igång?</span>
            <select name="timing" defaultValue={timings[0]}>
              {timings.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[1] = el)} hidden={step !== 1}>
        <legend className="sk-el-quote__title">Berätta om jobbet</legend>
        <label className="sk-el-input">
          <span>Beskrivning</span>
          <textarea name="details" rows={6} minLength={10} maxLength={4000} required placeholder="Vad ska göras? T.ex. antal uttag, bilmodell för laddbox, storlek på huvudsäkring…" />
        </label>
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[2] = el)} hidden={step !== 2}>
        <legend className="sk-el-quote__title">Hur når vi dig?</legend>
        <label className="sk-el-input">
          <span>Namn</span>
          <input name="name" autoComplete="name" required maxLength={120} />
          {status.fieldErrors?.name ? <small className="sk-field__error">{status.fieldErrors.name}</small> : null}
        </label>
        <label className="sk-el-input">
          <span>E-post</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} />
          {status.fieldErrors?.email ? <small className="sk-field__error">{status.fieldErrors.email}</small> : null}
        </label>
        <label className="sk-el-input">
          <span>Telefon</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        {consent ? <p className="sk-el-quote__consent">{consent}</p> : null}
      </fieldset>

      {status.state === "error" && status.message ? (
        <p className="sk-form__error" role="alert">
          {status.message}
        </p>
      ) : null}

      <div className="sk-el-quote__actions">
        {step > 0 ? (
          <button type="button" className="sk-el-btn sk-el-btn--outline" onClick={() => setStep((s) => s - 1)}>
            ← Tillbaka
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="sk-btn sk-btn--primary sk-el-btn" onClick={next}>
            Nästa steg →
          </button>
        ) : (
          <button type="submit" className="sk-btn sk-btn--primary sk-el-btn" disabled={status.state === "loading" || !token}>
            {status.state === "loading" ? "Skickar…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
