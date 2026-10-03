import Link from "next/link";

import { content } from "@/lib/staark";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const site = await content.getSite();

  return (
    <article className="staark-policy-page">
      <header>
        <p>Integritet</p>
        <h1>Integritetspolicy</h1>
      </header>

      <section>
        <h2>Personuppgifter</h2>

        <p>
          {site.name} behandlar de
          personuppgifter som du själv lämnar
          via webbplatsens formulär, till
          exempel namn, e-postadress,
          telefonnummer och meddelanden.
        </p>
      </section>

      <section>
        <h2>Varför uppgifterna används</h2>

        <p>
          Uppgifterna används för att kunna
          svara på förfrågningar, hantera
          bokningar och tillhandahålla den
          tjänst du kontaktar oss om.
        </p>
      </section>

      <section>
        <h2>Webbanalys</h2>

        <p>
          Webbplatsen kan samla in
          integritetsvänlig aggregerad
          trafikstatistik. Tjänster som kräver
          analyscookies aktiveras först efter
          ditt samtycke.
        </p>
      </section>

      <section>
        <h2>Dina val</h2>

        <p>
          Du kan välja bort valfria cookies
          och ändra dina val genom att rensa
          webbplatsens lokala lagring i din
          webbläsare. En särskild
          inställningsknapp kan också läggas
          till senare.
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>

        <p>
          Frågor om personuppgifter kan
          skickas till{" "}
          <a
            href={`mailto:${site.contact.email}`}
          >
            {site.contact.email}
          </a>.
        </p>
      </section>

      <p>
        <Link href={site.privacy.cookiePolicyPath}>
          Läs vår cookiepolicy
        </Link>
      </p>
    </article>
  );
}
