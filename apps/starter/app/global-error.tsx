"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sv">
      <body>
        <style>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            width: 100%;
            min-height: 100%;
            background: #090b0f;
            color: #f7f8fa;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          body {
            min-height: 100vh;
          }

          .error-page {
            position: relative;
            min-height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background:
              radial-gradient(
                circle at 50% 15%,
                rgba(57, 145, 255, 0.13),
                transparent 32%
              ),
              radial-gradient(
                circle at 80% 80%,
                rgba(83, 91, 255, 0.08),
                transparent 30%
              ),
              #090b0f;
          }

          .error-grid {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.18;
            background-image:
              linear-gradient(
                rgba(255,255,255,.035) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,.035) 1px,
                transparent 1px
              );
            background-size: 64px 64px;
            mask-image:
              linear-gradient(
                to bottom,
                rgba(0,0,0,.75),
                transparent 85%
              );
          }

          .error-header {
            position: relative;
            z-index: 2;
            width: 100%;
            padding: 30px 38px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .error-brand {
            display: inline-flex;
            align-items: center;
            gap: 11px;
            color: #fff;
            text-decoration: none;
          }

          .error-brand-mark {
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: 10px;
            background: #fff;
            color: #090b0f;
            font-weight: 900;
            font-size: 15px;
          }

          .error-brand strong {
            font-size: 14px;
            letter-spacing: .14em;
          }

          .error-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: rgba(255,255,255,.48);
            font-size: 12px;
          }

          .error-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #ffb84a;
            box-shadow: 0 0 18px rgba(255,184,74,.5);
          }

          .error-main {
            position: relative;
            z-index: 2;
            flex: 1;
            width: 100%;
            display: grid;
            place-items: center;
            padding: 70px 24px 110px;
          }

          .error-content {
            width: min(860px, 100%);
            text-align: center;
          }

          .error-code {
            margin: 0;
            font-size: clamp(110px, 18vw, 210px);
            line-height: .74;
            font-weight: 800;
            letter-spacing: -.085em;
            color: transparent;
            -webkit-text-stroke:
              1px rgba(255,255,255,.13);
            user-select: none;
          }

          .error-kicker {
            display: inline-flex;
            margin-top: 38px;
            padding: 7px 12px;
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 999px;
            background: rgba(255,255,255,.035);
            color: rgba(255,255,255,.56);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .13em;
          }

          .error-content h1 {
            margin: 22px auto 0;
            max-width: 720px;
            font-size: clamp(42px, 6vw, 72px);
            line-height: .98;
            letter-spacing: -.055em;
          }

          .error-copy {
            max-width: 590px;
            margin: 25px auto 0;
            color: rgba(255,255,255,.58);
            font-size: clamp(16px, 2vw, 18px);
            line-height: 1.7;
          }

          .error-actions {
            margin-top: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .error-button {
            min-height: 50px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            padding: 0 20px;
            border-radius: 14px;
            font: inherit;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            transition:
              transform .16s ease,
              border-color .16s ease,
              background .16s ease,
              opacity .16s ease;
            cursor: pointer;
          }

          .error-button:hover {
            transform: translateY(-2px);
          }

          .error-button-primary {
            border: 1px solid #fff;
            background: #fff;
            color: #090b0f;
          }

          .error-button-secondary {
            border: 1px solid rgba(255,255,255,.14);
            background: rgba(255,255,255,.045);
            color: #fff;
          }

          .error-button-secondary:hover {
            border-color: rgba(255,255,255,.28);
            background: rgba(255,255,255,.075);
          }

          .error-support {
            margin-top: 34px;
            color: rgba(255,255,255,.38);
            font-size: 12px;
            line-height: 1.6;
          }

          .error-support a {
            color: rgba(255,255,255,.68);
            text-decoration: none;
          }

          .error-support a:hover {
            color: #fff;
          }

          .error-reference {
            margin-top: 8px;
            color: rgba(255,255,255,.22);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 10px;
          }

          .error-footer {
            position: relative;
            z-index: 2;
            padding: 0 38px 30px;
            display: flex;
            justify-content: center;
            color: rgba(255,255,255,.24);
            font-size: 11px;
          }

          @media (max-width: 640px) {
            .error-header {
              padding: 22px;
            }

            .error-status {
              display: none;
            }

            .error-main {
              padding: 40px 20px 70px;
            }

            .error-code {
              font-size: clamp(100px, 34vw, 150px);
            }

            .error-actions {
              flex-direction: column;
              width: 100%;
            }

            .error-button {
              width: 100%;
            }

            .error-footer {
              padding: 0 22px 22px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .error-button {
              transition: none;
            }

            .error-button:hover {
              transform: none;
            }
          }
        `}</style>

        <div className="error-page">
          <div className="error-grid" />

          <header className="error-header">
            <a
              href="https://staarkinc.com/"
              className="error-brand"
            >
              <span className="error-brand-mark">S</span>
              <strong>STAARK</strong>
            </a>

            <span className="error-status">
              <span className="error-status-dot" />
              Tillfälligt problem
            </span>
          </header>

          <main className="error-main">
            <section className="error-content">
              <p className="error-code">500</p>

              <span className="error-kicker">
                SYSTEM ERROR
              </span>

              <h1>Något gick fel.</h1>

              <p className="error-copy">
                Webbplatsen kunde inte laddas just nu.
                Det kan vara ett tillfälligt problem.
                Försök igen eller kontakta Staark om
                problemet fortsätter.
              </p>

              <div className="error-actions">
                <button
                  type="button"
                  className="error-button error-button-primary"
                  onClick={() => reset()}
                >
                  Försök igen
                  <span aria-hidden="true">↻</span>
                </button>

                <a
                  href="https://staarkinc.com/"
                  className="error-button error-button-secondary"
                >
                  Staark Inc.
                  <span aria-hidden="true">↗</span>
                </a>

                <a
                  href="https://staarkinc.com/support"
                  className="error-button error-button-secondary"
                >
                  Kontakta support
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="error-support">
                Behöver du hjälp?{" "}
                <a href="https://staarkinc.com/support">
                  Besök Staark Support
                </a>

                {error.digest ? (
                  <div className="error-reference">
                    Referens: {error.digest}
                  </div>
                ) : null}
              </div>
            </section>
          </main>

          <footer className="error-footer">
            © Staark Inc. · Platform services
          </footer>
        </div>
      </body>
    </html>
  );
}