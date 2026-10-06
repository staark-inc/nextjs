"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  return (
    <div className="staark-error">
      <style>{`
        .staark-error {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(38, 117, 255, .16),
              transparent 34%
            ),
            #090b0f;
          color: #fff;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .staark-error-card {
          width: min(680px, 100%);
          text-align: center;
        }

        .staark-error-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 46px;
          color: rgba(255,255,255,.88);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .14em;
        }

        .staark-error-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff;
          color: #090b0f;
          font-size: 14px;
          font-weight: 900;
        }

        .staark-error-code {
          margin: 0;
          color: transparent;
          -webkit-text-stroke:
            1px rgba(255,255,255,.15);
          font-size: clamp(100px, 22vw, 180px);
          font-weight: 850;
          letter-spacing: -.08em;
          line-height: .8;
          user-select: none;
        }

        .staark-error-kicker {
          display: inline-flex;
          margin-top: 34px;
          padding: 7px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.5);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .staark-error h1 {
          margin: 19px 0 0;
          font-size: clamp(34px, 6vw, 52px);
          letter-spacing: -.045em;
        }

        .staark-error-copy {
          max-width: 540px;
          margin: 18px auto 0;
          color: rgba(255,255,255,.56);
          font-size: 15px;
          line-height: 1.7;
        }

        .staark-error-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 30px;
        }

        .staark-error-button {
          min-height: 46px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.14);
          font: inherit;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          text-decoration: none;
        }

        .staark-error-primary {
          background: #fff;
          color: #090b0f;
        }

        .staark-error-secondary {
          background: rgba(255,255,255,.04);
          color: #fff;
        }

        .staark-error-ref {
          margin-top: 24px;
          color: rgba(255,255,255,.23);
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 10px;
        }

        @media (max-width: 520px) {
          .staark-error-actions {
            flex-direction: column;
          }

          .staark-error-button {
            width: 100%;
          }
        }
      `}</style>

      <main className="staark-error-card">
        <div className="staark-error-brand">
          <span className="staark-error-mark">
            S
          </span>

          STAARK
        </div>

        <p className="staark-error-code">
          500
        </p>

        <span className="staark-error-kicker">
          SERVICE TEMPORARILY UNAVAILABLE
        </span>

        <h1>
          Något gick fel.
        </h1>

        <p className="staark-error-copy">
          Tjänsten kunde inte slutföra begäran just nu.
          Försök igen om en liten stund. Om problemet
          fortsätter arbetar Staark support med att
          återställa tjänsten.
        </p>

        <div className="staark-error-actions">
          <button
            type="button"
            className="staark-error-button staark-error-primary"
            onClick={() =>
              reset()
            }
          >
            Försök igen ↻
          </button>

          <a
            href="/admin/login"
            className="staark-error-button staark-error-secondary"
          >
            Admin
          </a>
        </div>

        {error.digest ? (
          <div className="staark-error-ref">
            Referens: {error.digest}
          </div>
        ) : null}
      </main>
    </div>
  );
}
