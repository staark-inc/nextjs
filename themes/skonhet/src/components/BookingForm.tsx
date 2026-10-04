"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookingFields, localToday, NO_PREFERENCE } from "../booking";

/**
 * Three-step booking request (behandling → tid → kontakt). Posts to the site's
 * /api/staark/forms route like the S-Hub Light contact form; the Hub forwards
 * it to S-Hub Inbox as a booking. It is a request, not a confirmed slot: the
 * salon confirms from the Inbox.
 */

export type BookingFormProps = {
  formId: string;
  endpoint?: string;
  services: string[];
  stylists: string[];
  times: string[];
  submitLabel: string;
  successMessage?: string;
  policy?: string;
};

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string; fieldErrors?: Record<string, string> };

const STEPS = ["Behandling", "Tid", "Kontakt"] as const;

export function BookingForm({ formId, endpoint = "/api/staark/bookings", services, stylists, times, submitLabel, successMessage, policy }: BookingFormProps) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [service, setService] = useState("");
  const [stylist, setStylist] = useState(NO_PREFERENCE);
  const [time, setTime] = useState("");
  const [today, setToday] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const doneRef = useRef<HTMLDivElement>(null);

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

  // Preselect from "Boka" links in serviceMenu (?tjanst=) and stylists (?med=).
  useEffect(() => {
    setToday(localToday());
    const params = new URLSearchParams(window.location.search);
    const wantedService = params.get("tjanst");
    const wantedStylist = params.get("med");
    if (wantedService && services.includes(wantedService)) setService(wantedService);
    if (wantedStylist && stylists.includes(wantedStylist)) setStylist(wantedStylist);
  }, [services, stylists]);

  useEffect(() => {
    if (status.state === "ok") doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status.state]);

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
    const text = (name: string) => String(data.get(name) ?? "");
    const fields = buildBookingFields({
      service: text("service"),
      stylist: text("stylist"),
      date: text("date"),
      time: text("time"),
      name: text("name"),
      email: text("email"),
      phone: text("phone"),
      message: text("message"),
    });

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
      <div ref={doneRef} className="sk-sb-booking__form sk-sb-booking__done" role="status">
        <p className="sk-sb-booking__title">
          Tack, <em>vi hörs snart</em>
        </p>
        <p>{status.message ?? "Vi bekräftar din tid via e-post eller sms."}</p>
      </div>
    );
  }

  return (
    <form className="sk-sb-booking__form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="sk-form__hp">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <ol className="sk-sb-progress" aria-label="Steg">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} data-done={i < step || undefined}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <fieldset ref={(el) => void (stepRefs.current[0] = el)} hidden={step !== 0}>
        <legend className="sk-sb-booking__title">Vad vill du boka?</legend>
        <div className="sk-sb-options">
          {services.map((s) => (
            <label key={s} className="sk-sb-option">
              <input type="radio" name="service" value={s} required checked={service === s} onChange={() => setService(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
        {stylists.length ? (
          <label className="sk-sb-input">
            <span>Önskad stylist</span>
            <select name="stylist" value={stylist} onChange={(e) => setStylist(e.target.value)}>
              <option>{NO_PREFERENCE}</option>
              {stylists.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[1] = el)} hidden={step !== 1}>
        <legend className="sk-sb-booking__title">När passar det?</legend>
        <label className="sk-sb-input">
          <span>Datum</span>
          <input type="date" name="date" min={today} required />
        </label>
        <div className="sk-sb-input">
          <span id="sk-sb-time-label">Önskad tid</span>
          <div className="sk-sb-times" role="radiogroup" aria-labelledby="sk-sb-time-label">
            {times.map((t) => (
              <label key={t} className="sk-sb-time">
                <input type="radio" name="time" value={t} required checked={time === t} onChange={() => setTime(t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="sk-sb-booking__hint">Vi bekräftar exakt tid när vi har sett schemat.</p>
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[2] = el)} hidden={step !== 2}>
        <legend className="sk-sb-booking__title">Dina uppgifter</legend>
        <label className="sk-sb-input">
          <span>Namn</span>
          <input name="name" autoComplete="name" required maxLength={120} />
          {status.fieldErrors?.name ? <small className="sk-field__error">{status.fieldErrors.name}</small> : null}
        </label>
        <div className="sk-sb-row">
          <label className="sk-sb-input">
            <span>E-post</span>
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
            {status.fieldErrors?.email ? <small className="sk-field__error">{status.fieldErrors.email}</small> : null}
          </label>
          <label className="sk-sb-input">
            <span>Telefon</span>
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
        </div>
        <label className="sk-sb-input">
          <span>Något vi bör veta? (valfritt)</span>
          <textarea name="message" rows={3} maxLength={2000} placeholder="Allergier, önskad längd, inspirationsbild…" />
        </label>
        {policy ? <p className="sk-sb-booking__hint">{policy}</p> : null}
      </fieldset>

      {status.state === "error" && status.message ? (
        <p className="sk-form__error" role="alert">
          {status.message}
        </p>
      ) : null}

      <div className="sk-sb-booking__actions">
        {step > 0 ? (
          <button type="button" className="sk-sb-btn sk-sb-btn--ghost" onClick={() => setStep((s) => s - 1)}>
            Tillbaka
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="sk-btn sk-btn--primary sk-sb-btn" onClick={next}>
            Fortsätt
          </button>
        ) : (
          <button type="submit" className="sk-btn sk-btn--primary sk-sb-btn" disabled={status.state === "loading" || !token}>
            {status.state === "loading" ? "Skickar…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
