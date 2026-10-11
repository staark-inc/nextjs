"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
type PublicForm = { key: string; phone: boolean; token: string };
export function ContactForm({ formKey }: { formKey: string }) {
  const [config, setConfig] = useState<PublicForm | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "sending" | "sent" | "error" | "unavailable">("loading");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const endpoint = `/api/addons/forms/${encodeURIComponent(formKey)}`;
  async function reload(signal?: AbortSignal) {
    const response = await fetch(endpoint, { cache: "no-store", signal });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json() as PublicForm;
    setConfig(data);
  }
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");setConfig(null);
    reload(controller.signal).then(() => setStatus("ready")).catch(() => { if (!controller.signal.aborted) setStatus("unavailable"); });
    return () => controller.abort();
  }, [endpoint]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config || inFlight.current) return;
    inFlight.current = true;setStatus("sending");setMessage("");
    const element = event.currentTarget;
    const data = new FormData(element);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), phone: data.get("phone") ?? "", message: data.get("message"), website: data.get("website") ?? "", token: config.token }) });
      if (!response.ok) {
        setMessage(response.status === 429 ? "För många försök. Vänta en stund och försök igen." : response.status === 400 ? "Kontrollera dina uppgifter och försök igen om några sekunder." : "Meddelandet kunde inte skickas. Försök igen senare eller kontakta oss via e-post.");
        setStatus("error");
        // A fresh token permits retrying after a token expiry, without clearing input.
        if (response.status === 400) await reload();
        return;
      }
      setStatus("sent");element.reset();
    } catch { setStatus("error");setMessage("Meddelandet kunde inte skickas. Kontrollera din anslutning och försök igen."); }
    finally { inFlight.current = false; }
  }
  if (status === "loading") return <p role="status">Laddar formuläret…</p>;
  if (status === "unavailable") return <p role="status">Formuläret är inte tillgängligt just nu. Kontakta oss via e-post.</p>;
  if (status === "sent") return <div className="cb-form__success" role="status"><h3>Tack för ditt meddelande.</h3><p>Ditt meddelande har skickats. Vi återkommer så snart vi kan.</p><button type="button" onClick={() => { setStatus("loading");reload().then(() => setStatus("ready")).catch(() => setStatus("unavailable")); }}>Skicka ett nytt meddelande</button></div>;
  return <form className="cb-form" onSubmit={submit} aria-busy={status === "sending"}>
    <div className="cb-form__row"><label>Namn <span aria-hidden="true">*</span><input name="name" autoComplete="name" required minLength={2} maxLength={120} disabled={status === "sending"} /></label><label>E-post <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" required maxLength={254} disabled={status === "sending"} /></label></div>
    {config?.phone ? <label>Telefon <span className="cb-form__optional">(valfritt)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={status === "sending"} /></label> : null}
    <label>Meddelande <span aria-hidden="true">*</span><textarea name="message" rows={6} required minLength={10} maxLength={5000} disabled={status === "sending"} /></label>
    <div className="cb-form__trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="cb-form__note">Uppgifterna används för att besvara din förfrågan. Fält med * är obligatoriska.</p>
    {message ? <p className="cb-form__error" role="alert">{message}</p> : null}
    <button className="cb-button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Skickar…" : "Skicka meddelande →"}</button>
  </form>;
}
