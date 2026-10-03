import Link from "next/link";

import { content } from "@/lib/staark";

export const dynamic = "force-dynamic";

export default async function CookiePolicyPage() {
  const site = await content.getSite();
  const policy = site.privacy.cookiePolicy;

  return (
    <article className="staark-policy-page">
      <header>
        <p>Cookies</p>
        <h1>{policy.title}</h1>

        <div className="staark-policy-page__intro">
          {policy.intro}
        </div>
      </header>

      <section>
        <h2>Nödvändiga funktioner</h2>
        <p>{policy.necessary}</p>
      </section>

      <section>
        <h2>Analys</h2>
        <p>{policy.analytics}</p>
      </section>

      {site.privacy.marketingConsentEnabled ? (
        <section>
          <h2>Marknadsföring</h2>
          <p>{policy.marketing}</p>
        </section>
      ) : null}

      <section>
        <h2>Ändra ditt val</h2>
        <p>{policy.choices}</p>

        <p>
          <a href="#cookie-settings">
            Öppna cookieinställningar
          </a>
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
