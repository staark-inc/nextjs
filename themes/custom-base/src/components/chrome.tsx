import type { SiteSettings } from "@staark/core";
import { Button, Container } from "./primitives";

export function CustomSiteHeader({ site, extraLinks = [] }: { site: SiteSettings; extraLinks?: { label: string; href: string }[] }) {
  const links = [...site.navigation.primary];
  for (const link of extraLinks) if (!links.some(item => item.href === link.href)) links.push(link);
  return <header className="cb-header"><Container className="cb-header__inner">
    <a href="/" className="cb-brand"><span className="cb-brand__mark" aria-hidden="true">✳</span>{site.name}<span className="cb-brand__dot">.</span></a>
    <nav className="cb-nav" aria-label="Huvudmeny">{links.map((link, index) => <a key={index} href={link.href}>{link.label}</a>)}</nav>
    {site.navigation.cta ? <Button href={site.navigation.cta.href} secondary>{site.navigation.cta.label}</Button> : null}
  </Container></header>;
}
export function CustomSiteFooter({ site }: { site: SiteSettings }) {
  return <footer className="cb-footer"><Container>
    <div className="cb-footer__top"><a className="cb-brand" href="/"><span aria-hidden="true">✳</span> {site.name}.</a><p>{site.tagline ?? "En egen riktning. En genomtänkt grund."}</p><a href={`mailto:${site.contact.email}`}>{site.contact.email} ↗</a></div>
    <div className="cb-footer__bottom"><span>{site.brand.copyright ?? `© ${new Date().getFullYear()} ${site.name}`}</span><nav aria-label="Sidfot">{site.navigation.footer.map((link, index) => <a key={index} href={link.href}>{link.label}</a>)}</nav><span>Made with intention.</span></div>
  </Container></footer>;
}
