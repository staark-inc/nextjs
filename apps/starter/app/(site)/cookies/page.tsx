import Link from "next/link";

import { content } from "@/lib/staark";

export const dynamic = "force-dynamic";

export default async function CookiePolicyPage() {
  const site = await content.getSite();

  return (
    <article className="staark-policy-page">
      <header>
        <p>Cookies</p>
        <h1>Cookiepolicy</h1>
      </header>

      <section>
        <h2>Nödvändiga funktioner</h2>

        <p>
          Webbplatsen kan använda teknisk
          lagring som behövs för säkerhet,
          inloggning och för att komma ihåg
          dina cookieval.
        </p>
      </section>

      <section>
        <h2>Analys</h2>

        <p>
          Staarks egen trafikmätning använder
          aggregerade sidvisningar och kräver
          inte analyscookies. Externa
          analystjänster, till exempel Google
          Analytics, får endast använda
          analyslagring när du har godkänt
          detta.
        </p>
      </section>

      {site.privacy.marketingConsentEnabled ? (
        <section>
          <h2>Marknadsföring</h2>

          <p>
            Marknadsföringsrelaterad lagring
            används endast när du uttryckligen
            har godkänt marknadsföring.
          </p>
        </section>
      ) : null}

      <section>
        <h2>Ändra ditt val</h2>

        <p>
          Du kan neka valfria cookies direkt
          i bannern. Om samtyckesversionen
          ändras kommer webbplatsen att fråga
          efter ditt val igen.
        </p>
      </section>

      <p>
        <Link href={site.privacy.privacyPolicyPath}>
          Läs vår integritetspolicy
        </Link>
      </p>
    </article>
  );
}
