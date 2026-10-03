"use client";

import { useEffect, useRef, useState } from "react";
import { buildServiceBooking, localToday, normalizePlate } from "../booking";

/**
 * Three-step workshop booking (bil → tjänst & tid → kontakt). Posts to the
 * site's /api/staark/forms route; S-Hub Inbox files it as a booking with the
 * registration number as booking_item. It is a request: the workshop confirms.
 */

export type ServiceBookingFormProps = {
  formId: string;
  endpoint?: string;
  services: string[];
  dropOffTimes: string[];
  loanCar: boolean;
  submitLabel: string;
  successMessage?: string;
  consent?: string;
};

type Status = { state: "idle" | "loading" | "ok" | "error"; message?: string; fieldErrors?: Record<string, string> };

const STEPS = ["Bil", "Tjänst & tid", "Kontakt"] as const;

export function ServiceBookingForm({ formId, endpoint = "/api/staark/forms", services, dropOffTimes, loanCar, submitLabel, successMessage, consent }: ServiceBookingFormProps) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [plate, setPlate] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [today, setToday] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const doneRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

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

  // Prefill from the hero plate box (?regnr=) and price-table links (?tjanst=).
  useEffect(() => {
    setToday(localToday());
    const params = new URLSearchParams(window.location.search);
    const regnr = params.get("regnr");
    const wanted = params.get("tjanst");
    if (regnr) setPlate(normalizePlate(regnr) ?? regnr.toUpperCase());
    if (wanted) {
      const match = services.find((s) => s.toLowerCase() === wanted.toLowerCase());
      setPicked([match ?? wanted]);
    }
  }, [services]);

  useEffect(() => {
    if (status.state === "ok") doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [status.state]);

  const serviceOptions = picked.filter((s) => !services.includes(s)).concat(services);

  function stepIsValid(index: number): boolean {
    const fieldset = stepRefs.current[index];
    if (!fieldset) return true;
    const controls = Array.from(fieldset.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    const invalid = controls.find((c) => !c.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (index === 1 && picked.length === 0) {
      const first = servicesRef.current?.querySelector<HTMLInputElement>("input");
      first?.setCustomValidity("Välj minst en tjänst.");
      first?.reportValidity();
      first?.setCustomValidity("");
      return false;
    }
    return true;
  }

  function next() {
    if (stepIsValid(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function toggle(service: string) {
    setPicked((current) => (current.includes(service) ? current.filter((s) => s !== service) : [...current, service]));
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
    const fields = buildServiceBooking({
      plate: text("plate"),
      car: text("car"),
      mileage: text("mileage"),
      services: picked,
      date: text("date"),
      dropOff: text("dropOff"),
      loanCar: data.get("loanCar") === "on",
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
      <div ref={doneRef} className="sk-vk-booking__form sk-vk-booking__done" role="status">
        <p className="sk-vk-booking__title">Tack!</p>
        <p>{status.message ?? "Vi bekräftar tiden via sms eller e-post."}</p>
        <p className="sk-vk-plate-chip">{normalizePlate(plate) ?? plate}</p>
      </div>
    );
  }

  return (
    <form className="sk-vk-booking__form" onSubmit={onSubmit} noValidate>
      <div aria-hidden className="sk-form__hp">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <ol className="sk-vk-progress" aria-label="Steg">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} data-done={i < step || undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <fieldset ref={(el) => void (stepRefs.current[0] = el)} hidden={step !== 0}>
        <legend className="sk-vk-booking__title">Vilken bil gäller det?</legend>
        <label className="sk-vk-input">
          <span>Registreringsnummer</span>
          <span className="sk-vk-plate__field sk-vk-plate__field--form">
            <span className="sk-vk-plate__eu" aria-hidden>
              S
            </span>
            <input
              name="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onBlur={() => setPlate((v) => normalizePlate(v) ?? v)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC 123"
              maxLength={8}
              pattern="[A-Za-z]{3}[\s\-]?[0-9]{2}[A-Za-z0-9]"
              title="Tre bokstäver och tre tecken, t.ex. ABC 123"
              required
            />
          </span>
        </label>
        <div className="sk-vk-row">
          <label className="sk-vk-input">
            <span>Märke & modell (valfritt)</span>
            <input name="car" placeholder="Volvo V60" maxLength={60} />
          </label>
          <label className="sk-vk-input">
            <span>Mätarställning, mil (valfritt)</span>
            <input name="mileage" inputMode="numeric" placeholder="12 300" maxLength={10} />
          </label>
        </div>
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[1] = el)} hidden={step !== 1}>
        <legend className="sk-vk-booking__title">Vad ska vi göra?</legend>
        <div className="sk-vk-checks" ref={servicesRef} role="group" aria-label="Tjänster">
          {serviceOptions.map((s) => (
            <label key={s} className="sk-vk-check">
              <input type="checkbox" checked={picked.includes(s)} onChange={() => toggle(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
        <div className="sk-vk-row">
          <label className="sk-vk-input">
            <span>Önskat datum</span>
            <input type="date" name="date" min={today} required />
          </label>
          <label className="sk-vk-input">
            <span>Lämna bilen</span>
            <select name="dropOff" defaultValue={dropOffTimes[0]}>
              {dropOffTimes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        {loanCar ? (
          <label className="sk-vk-toggle">
            <input type="checkbox" name="loanCar" />
            <span>Jag behöver lånebil</span>
          </label>
        ) : null}
        <label className="sk-vk-input">
          <span>Beskriv problemet (valfritt)</span>
          <textarea name="message" rows={3} maxLength={2000} placeholder="T.ex. gnisslar vid inbromsning, varningslampa…" />
        </label>
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[2] = el)} hidden={step !== 2}>
        <legend className="sk-vk-booking__title">Kontaktuppgifter</legend>
        <label className="sk-vk-input">
          <span>Namn</span>
          <input name="name" autoComplete="name" required maxLength={120} />
          {status.fieldErrors?.name ? <small className="sk-field__error">{status.fieldErrors.name}</small> : null}
        </label>
        <div className="sk-vk-row">
          <label className="sk-vk-input">
            <span>E-post</span>
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
            {status.fieldErrors?.email ? <small className="sk-field__error">{status.fieldErrors.email}</small> : null}
          </label>
          <label className="sk-vk-input">
            <span>Mobil</span>
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
        </div>
        {consent ? <p className="sk-vk-booking__hint">{consent}</p> : null}
      </fieldset>

      {status.state === "error" && status.message ? (
        <p className="sk-form__error" role="alert">
          {status.message}
        </p>
      ) : null}

      <div className="sk-vk-booking__actions">
        {step > 0 ? (
          <button type="button" className="sk-vk-btn sk-vk-btn--outline" onClick={() => setStep((s) => s - 1)}>
            Tillbaka
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="sk-btn sk-btn--primary sk-vk-btn" onClick={next}>
            Nästa
          </button>
        ) : (
          <button type="submit" className="sk-btn sk-btn--primary sk-vk-btn" disabled={status.state === "loading" || !token}>
            {status.state === "loading" ? "Skickar…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
