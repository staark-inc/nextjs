"use client";

import { useMemo, useState } from "react";

type WebsiteType =
  | "business"
  | "salon"
  | "restaurant"
  | "hotel"
  | "automotive"
  | "portfolio"
  | "custom";

const WEBSITE_TYPES: Array<{
  id: WebsiteType;
  label: string;
  hint: string;
}> = [
  { id: "business", label: "Business", hint: "Company or local service" },
  { id: "salon", label: "Salon", hint: "Hair, beauty or barber" },
  { id: "restaurant", label: "Restaurant", hint: "Food, café or venue" },
  { id: "hotel", label: "Hotel", hint: "Hotel, B&B or guesthouse" },
  { id: "automotive", label: "Automotive", hint: "Workshop or vehicle services" },
  { id: "portfolio", label: "Portfolio", hint: "Creator or personal brand" },
  { id: "custom", label: "Custom", hint: "Start with a flexible base" },
];

const THEMES = [
  ["light", "Light"],
  ["salong", "Salong"],
  ["skonhet", "Skönhet"],
  ["el", "El"],
  ["gastfrihet", "Gästfrihet"],
  ["byra", "Byrå"],
  ["webb", "Webb"],
  ["kreator", "Kreatör"],
  ["verkstad", "Verkstad"],
] as const;

const RECOMMENDED_THEME: Record<WebsiteType, string> = {
  business: "light",
  salon: "salong",
  restaurant: "light",
  hotel: "gastfrihet",
  automotive: "verkstad",
  portfolio: "kreator",
  custom: "light",
};

export default function SetupWizard({
  siteKey,
  publicUrl,
  endpoint = "/api/admin/setup",
  ownerRequired = false,
}: {
  siteKey: string;
  publicUrl: string;
  endpoint?: string;
  ownerRequired?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState(publicUrl);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState("sv-SE");
  const [websiteType, setWebsiteType] =
    useState<WebsiteType>("business");
  const [theme, setTheme] = useState("light");
  const [contact, setContact] = useState(true);
  const [about, setAbout] = useState(true);
  const [services, setServices] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const steps = ownerRequired
    ? ["Company", "Profile", "Pages", "Owner", "Review"]
    : ["Company", "Profile", "Pages", "Review"];

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(name.trim() && url.trim() && email.trim());
    }

    if (ownerRequired && step === 3) {
      return Boolean(
        ownerName.trim() &&
          ownerEmail.trim() &&
          ownerPassword.length >= 12 &&
          ownerPassword === ownerPasswordConfirm,
      );
    }

    return true;
  }, [
    email,
    name,
    ownerEmail,
    ownerName,
    ownerPassword,
    ownerPasswordConfirm,
    ownerRequired,
    step,
    url,
  ]);

  function chooseWebsiteType(next: WebsiteType) {
    setWebsiteType(next);
    setTheme(RECOMMENDED_THEME[next]);
  }

  async function finish() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          email,
          phone,
          locale,
          websiteType,
          theme,
          pages: { contact, about, services },
          ...(ownerRequired
            ? {
                owner: {
                  name: ownerName,
                  email: ownerEmail,
                  password: ownerPassword,
                },
              }
            : {}),
        }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Setup failed.");
      }

      window.location.assign("/admin");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Setup failed.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="firstSetup">
      <header className="firstSetup__hero">
        <div>
          <span className="firstSetup__eyebrow">
            Staark · First configuration
          </span>
          <h1>Build the first version of your site.</h1>
          <p>
            This runs once for <code>{siteKey || "STAARK_SITE_KEY"}</code>.
            You can change everything later in Admin.
          </p>
        </div>
        <div className="firstSetup__stepCount">
          {step + 1}/{steps.length}
        </div>
      </header>

      <nav className="firstSetup__steps" aria-label="Setup progress">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={
              index === step
                ? "is-active"
                : index < step
                  ? "is-done"
                  : ""
            }
            onClick={() => {
              if (index <= step) setStep(index);
            }}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      <section className="firstSetup__panel">
        {step === 0 ? (
          <>
            <div className="firstSetup__heading">
              <h2>Company details</h2>
              <p>Used for the site identity, metadata and contact details.</p>
            </div>

            <div className="firstSetup__grid">
              <label className="firstSetup__field firstSetup__field--wide">
                <span>Company / site name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Salong Nova"
                  autoFocus
                />
              </label>

              <label className="firstSetup__field firstSetup__field--wide">
                <span>Public URL</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.se"
                  inputMode="url"
                  readOnly={Boolean(publicUrl)}
                />
                {publicUrl ? (
                  <small>Assigned automatically from the primary domain.</small>
                ) : null}
              </label>

              <label className="firstSetup__field">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="hello@example.se"
                  inputMode="email"
                />
              </label>

              <label className="firstSetup__field">
                <span>Phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+46 ..."
                />
              </label>

              <label className="firstSetup__field">
                <span>Locale</span>
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                >
                  <option value="sv-SE">Svenska (sv-SE)</option>
                  <option value="en-US">English (en-US)</option>
                  <option value="ro-RO">Română (ro-RO)</option>
                </select>
              </label>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="firstSetup__heading">
              <h2>Website profile</h2>
              <p>
                Profile controls product features. Theme controls the visual
                presentation.
              </p>
            </div>

            <div className="firstSetup__cards">
              {WEBSITE_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={
                    websiteType === item.id
                      ? "firstSetup__choice is-selected"
                      : "firstSetup__choice"
                  }
                  onClick={() => chooseWebsiteType(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </button>
              ))}
            </div>

            <div className="firstSetup__theme">
              <label className="firstSetup__field">
                <span>Theme</span>
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                >
                  {THEMES.map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Recommended for this profile:{" "}
                <strong>{RECOMMENDED_THEME[websiteType]}</strong>
              </p>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="firstSetup__heading">
              <h2>Initial pages</h2>
              <p>
                Home is always created. Choose the other pages you want ready
                on day one.
              </p>
            </div>

            <div className="firstSetup__pageList">
              <div className="firstSetup__pageRow is-fixed">
                <div>
                  <strong>Home</strong>
                  <span>/</span>
                </div>
                <span>Always</span>
              </div>

              <label className="firstSetup__pageRow">
                <div>
                  <strong>Services / vertical page</strong>
                  <span>
                    {websiteType === "salon"
                      ? "/priser"
                      : websiteType === "hotel"
                        ? "/rum"
                        : "/tjanster"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={services}
                  onChange={(event) => setServices(event.target.checked)}
                />
              </label>

              <label className="firstSetup__pageRow">
                <div>
                  <strong>About</strong>
                  <span>/om-oss</span>
                </div>
                <input
                  type="checkbox"
                  checked={about}
                  onChange={(event) => setAbout(event.target.checked)}
                />
              </label>

              <label className="firstSetup__pageRow">
                <div>
                  <strong>Contact</strong>
                  <span>/kontakt</span>
                </div>
                <input
                  type="checkbox"
                  checked={contact}
                  onChange={(event) => setContact(event.target.checked)}
                />
              </label>
            </div>
          </>
        ) : null}

        {ownerRequired && step === 3 ? (
          <>
            <div className="firstSetup__heading">
              <h2>Create the owner account</h2>
              <p>This account will own and manage this website after setup.</p>
            </div>

            <div className="firstSetup__grid">
              <label className="firstSetup__field">
                <span>Your name</span>
                <input
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <label className="firstSetup__field">
                <span>Login email</span>
                <input
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  inputMode="email"
                  autoComplete="email"
                />
                <small>Use the email that received the setup invitation when one was pre-provisioned.</small>
              </label>
              <label className="firstSetup__field">
                <span>Password</span>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <small>At least 12 characters.</small>
              </label>
              <label className="firstSetup__field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={ownerPasswordConfirm}
                  onChange={(event) => setOwnerPasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
          </>
        ) : null}

        {(ownerRequired ? step === 4 : step === 3) ? (
          <>
            <div className="firstSetup__heading">
              <h2>Ready to create</h2>
              <p>
                The site and all selected pages are written atomically to
                PostgreSQL.
              </p>
            </div>

            <dl className="firstSetup__review">
              <div><dt>Site key</dt><dd>{siteKey}</dd></div>
              <div><dt>Name</dt><dd>{name}</dd></div>
              <div><dt>URL</dt><dd>{url}</dd></div>
              <div><dt>Profile</dt><dd>{websiteType}</dd></div>
              <div><dt>Theme</dt><dd>{theme}</dd></div>
              <div>
                <dt>Pages</dt>
                <dd>
                  Home
                  {services ? ", Services" : ""}
                  {about ? ", About" : ""}
                  {contact ? ", Contact" : ""}
                </dd>
              </div>
            </dl>

            <div className="firstSetup__notice">
              After setup, this wizard locks itself and future changes happen
              through Admin.
            </div>
          </>
        ) : null}

        {error ? (
          <div className="firstSetup__error" role="alert">
            {error}
          </div>
        ) : null}

        <footer className="firstSetup__actions">
          <button
            type="button"
            className="firstSetup__button firstSetup__button--ghost"
            disabled={step === 0 || busy}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              className="firstSetup__button"
              disabled={!canContinue || busy}
              onClick={() => setStep((current) => current + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="firstSetup__button"
              disabled={busy}
              onClick={finish}
            >
              {busy ? "Creating…" : "Create website"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
