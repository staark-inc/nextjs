import Link from "next/link";

import { content } from "@/lib/staark";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const site = await content.getSite();
  const policy = site.privacy.privacyPolicy;

  return (
    <article className="staark-policy-page">
      <header>
        <p>Integritet</p>
        <h1>{policy.title}</h1>
        <div className="staark-policy-page__intro">
          {policy.intro}
        </div>
      </header>

      <section>
        <h2>Personuppgifter</h2>
        <p>{policy.personalData}</p>
      </section>

      <section>
        <h2>Varför uppgifterna används</h2>
        <p>{policy.purpose}</p>
      </section>

      <section>
        <h2>Webbanalys</h2>
        <p>{policy.analytics}</p>
      </section>

      <section>
        <h2>Dina rättigheter</h2>
        <p>{policy.rights}</p>
      </section>

      <section>
        <h2>Kontakt</h2>

        <p>
          Frågor om personuppgifter kan skickas till{" "}
          <a href={`mailto:${site.contact.email}`}>
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
