import type { SiteSettings } from "@staark/core";

export function SiteHeader({ site, variant }: { site: SiteSettings; variant: string }) {
  const cta = site.navigation.cta;
  return (
    <header className={`sk-header sk-header--${variant}`}>
      <div className="sk-container sk-container--wide sk-header__inner">
        <a className="sk-header__brand" href="/">
          {site.brand.logo ? <img src={site.brand.logo.src} alt={site.brand.logo.alt || site.name} height={32} /> : <span>{site.name}</span>}
        </a>
        <nav className="sk-header__nav" aria-label="Huvudmeny">
          {site.navigation.primary.map((link, i) => (
            <a key={`${link.href}-${i}`} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        {cta ? (
          <a className="sk-btn sk-btn--primary sk-header__cta" href={cta.href}>
            {cta.label}
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooter({ site, variant }: { site: SiteSettings; variant: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={`sk-footer sk-footer--${variant}`}>
      <div className="sk-container sk-container--wide sk-footer__inner">
        <div className="sk-footer__brand">
          <strong>{site.name}</strong>
          {site.tagline ? <p>{site.tagline}</p> : null}
          <p>
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </p>
        </div>
        <nav className="sk-footer__nav" aria-label="Sidfot">
          {site.navigation.footer.map((link, i) => (
            <a key={`${link.href}-${i}`} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="sk-footer__legal">
        <div className="sk-container sk-container--wide">
          {site.brand.copyright ?? `© ${year} ${site.name}`} · <span>Byggd och driftad av Staark Inc.</span>
        </div>
      </div>
    </footer>
  );
}
