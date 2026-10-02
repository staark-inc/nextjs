"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sv">
      <body>
        <style>{`
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            min-height: 100%;
            background: #0b0d10;
            color: #f5f7fa;
            font-family:
              Inter, ui-sans-serif, system-ui, -apple-system,
              BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .staark-error {
            position: relative;
            min-height: 100vh;
            display: grid;
            place-items: center;
            overflow: hidden;
            padding: 32px;
          }

          .staark-error::before {
            content: "";
            position: absolute;
            width: 620px;
            height: 620px;
            border-radius: 999px;
            background:
              radial-gradient(circle, rgba(72,166,255,.16), transparent 68%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }

          .staark-error__inner {
            position: relative;
            z-index: 1;
            width: min(680px, 100%);
            text-align: center;
          }

          .staark-error__brand {
            display: inline-flex;
            margin-bottom: 38px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .22em;
            opacity: .62;
          }

          .staark-error__code {
            display: inline-flex;
            padding: 7px 12px;
            margin-bottom: 22px;
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .12em;
            opacity: .7;
          }

          .staark-error h1 {
            margin: 0;
            font-size: clamp(44px, 8vw, 78px);
            line-height: .98;
            letter-spacing: -.055em;
          }

          .staark-error p {
            max-width: 520px;
            margin: 26px auto 0;
            color: rgba(245,247,250,.62);
            font-size: 17px;
            line-height: 1.7;
          }

          .staark-error__actions {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 34px;
            flex-wrap: wrap;
          }

          .staark-error button,
          .staark-error a {
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
            border-radius: 999px;
            font: inherit;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
          }

          .staark-error button {
            border: 0;
            background: #f5f7fa;
            color: #0b0d10;
          }

          .staark-error a {
            border: 1px solid rgba(255,255,255,.14);
            background: rgba(255,255,255,.04);
            color: #f5f7fa;
          }

          .staark-error small {
            display: block;
            margin-top: 34px;
            color: rgba(245,247,250,.35);
          }
        `}</style>

        <main className="staark-error">
          <div className="staark-error__inner">
            <span className="staark-error__brand">STAARK</span>
            <br />
            <span className="staark-error__code">SYSTEM ERROR</span>

            <h1>Något gick fel.</h1>

            <p>
              Webbplatsen kunde inte laddas just nu.
              Försök igen eller gå tillbaka till startsidan.
            </p>

            <div className="staark-error__actions">
              <button type="button" onClick={() => reset()}>
                Försök igen
              </button>

              <a href="/">Till startsidan</a>
            </div>

            <small>Staark Platform</small>
          </div>
        </main>
      </body>
    </html>
  );
}
