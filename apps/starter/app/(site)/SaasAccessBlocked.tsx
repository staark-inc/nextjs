type Props = {
  status?: string | null;
};

function messageForStatus(status?: string | null) {
  const normalized =
    status?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "unpaid":
    case "past_due":
    case "suspended":
    case "paused":
      return {
        title: "Webbplatsen är tillfälligt pausad",
        description:
          "Webbplatsen är tillfälligt otillgänglig på grund av abonnemangets status. Kontakta webbplatsens ägare eller Staark om du behöver hjälp.",
      };

    case "incomplete":
    case "incomplete_expired":
      return {
        title: "Webbplatsen är inte aktiverad ännu",
        description:
          "Abonnemanget eller betalningen är ännu inte färdigställd. Kontakta webbplatsens ägare eller Staark om du behöver hjälp.",
      };

    case "canceled":
      return {
        title: "Webbplatsen är inte längre aktiv",
        description:
          "Abonnemanget för webbplatsen är avslutat. Kontakta webbplatsens ägare eller Staark om du behöver hjälp.",
      };

    default:
      return {
        title: "Webbplatsen är tillfälligt inaktiverad",
        description:
          "Webbplatsen är för närvarande inte tillgänglig. Kontakta webbplatsens ägare eller Staark om du behöver hjälp.",
      };
  }
}

export function SaasAccessBlocked({
  status,
}: Props) {
  const message =
    messageForStatus(status);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background: "#f7f8fb",
        color: "#111827",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "620px",
          padding: "48px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "20px",
          boxShadow:
            "0 18px 55px rgba(15,23,42,.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            marginBottom: "22px",
            padding: "7px 11px",
            borderRadius: "999px",
            background: "#eef2ff",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: ".08em",
          }}
        >
          STAARK
        </div>

        <h1
          style={{
            margin: "0 0 14px",
            fontSize: "30px",
            lineHeight: 1.15,
          }}
        >
          {message.title}
        </h1>

        <p
          style={{
            margin: "0 auto",
            maxWidth: "470px",
            color: "#6b7280",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          {message.description}
        </p>

        <a
          href="https://staarkinc.com/support"
          style={{
            display: "inline-flex",
            marginTop: "28px",
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#111827",
            color: "#fff",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Kontakta support
        </a>
      </section>
    </main>
  );
}
