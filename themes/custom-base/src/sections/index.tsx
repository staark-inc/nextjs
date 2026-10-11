import { ContactForm } from "../components/ContactForm";
import { GalleryViewer } from "../components/GalleryViewer";
import type { SectionComponent } from "@staark/theme-kit";
import { customBaseBlockSchemas as schemas } from "../blocks.ts";
import { Button, Container, Eyebrow } from "../components/primitives";

export const Hero: SectionComponent<any> = ({ props }) => {
  const p = schemas.hero.parse(props);
  return <section className={`cb-hero${p.artwork ? "" : " cb-hero--type"}`}><Container className="cb-hero__grid">
    <div className="cb-hero__copy"><Eyebrow>{p.eyebrow}</Eyebrow><h1>{p.heading}</h1><p>{p.intro}</p><div className="cb-actions">{p.primary ? <Button href={p.primary.href}>{p.primary.label}</Button> : null}{p.secondary ? <Button href={p.secondary.href} secondary>{p.secondary.label}</Button> : null}</div><span className="cb-hero__note">{p.note}</span></div>
    {p.artwork ? <div className="cb-art" aria-hidden="true"><span className="cb-art__label">A NEW PERSPECTIVE / 001</span><div className="cb-art__disc" /><div className="cb-art__bar" /><span className="cb-art__star">✳</span><div className="cb-art__caption"><span>Form follows<br />your idea.</span><span>↗</span></div></div> : null}
  </Container><Container className="cb-hero__bottom"><span>Independent spirit. Shared foundations.</span>{p.more ? <a href={p.more.href}>{p.more.label}</a> : null}</Container></section>;
};
export const Text: SectionComponent<any> = ({ props }) => {
  const p = schemas.text.parse(props);
  return <section className="cb-section" id="story"><Container className="cb-editorial"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2></div><div className="cb-editorial__body"><p className="cb-intro">{p.intro}</p>{p.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div></Container></section>;
};
export const Services: SectionComponent<any> = ({ props }) => {
  const p = schemas.services.parse(props);
  return <section className="cb-section cb-section--surface" id="services"><Container><div className="cb-section__heading"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2></div><p>{p.intro}</p></div><div className="cb-features">{p.items.map((item, i) => <div className="cb-feature" key={i}><span className="cb-feature__number">{String(i + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.text}</p>{item.label ? <span className="cb-tag">{item.label}</span> : null}</div>)}</div></Container></section>;
};
export const Projects: SectionComponent<any> = ({ props }) => {
  const p = schemas.projectsShowcase.parse(props);
  return <section className="cb-section" id="work"><Container><div className="cb-section__heading"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2></div><p>{p.intro}</p></div><div className="cb-projects">{p.items.map((item, i) => <article key={i} className="cb-project"><div className={`cb-cover cb-cover--${item.tone}`} aria-hidden="true"><span>{String(i + 1).padStart(2, "0")} / CONCEPT</span><strong>{item.title}</strong><div className="cb-cover__shape" /></div><div className="cb-project__meta"><div><span className="cb-eyebrow">{item.category}</span><h3>{item.href ? <a href={item.href}>{item.title} ↗</a> : item.title}</h3></div></div><p>{item.description}</p></article>)}</div></Container></section>;
};
export const Stats: SectionComponent<any> = ({ props }) => {
  const p = schemas.stats.parse(props);
  return <section className="cb-stat-strip"><Container className="cb-stats">{p.items.map((item, i) => <div key={i}><strong>{item.value}</strong><span>{item.label}</span></div>)}</Container></section>;
};
export const Shortcuts: SectionComponent<any> = ({ props }) => {
  const p = schemas.shortcuts.parse(props);
  return <section className="cb-section"><Container><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2>{p.intro ? <p className="cb-intro">{p.intro}</p> : null}<nav className="cb-shortcuts" aria-label={p.heading}>{p.links.map((link, i) => <a key={i} href={link.href}><span>{link.label}</span><span aria-hidden="true">↗</span></a>)}</nav></Container></section>;
};
export const Cta: SectionComponent<any> = ({ props }) => {
  const p = schemas.cta.parse(props);
  return <section className="cb-cta" id="contact"><Container><Eyebrow>{p.eyebrow}</Eyebrow><div className="cb-cta__grid"><h2>{p.heading}</h2><div><p>{p.intro}</p>{p.link ? <Button href={p.link.href}>{p.link.label}</Button> : null}</div><span className="cb-cta__star" aria-hidden="true">✳</span></div></Container></section>;
};

export const ImageText: SectionComponent<any> = ({ props }) => {
  const p = schemas.imageText.parse(props);
  return <section className="cb-section" id={p.anchor}><Container className={`cb-split cb-split--${p.side}`}>
    {p.image ? <figure><img src={p.image.src} alt={p.image.alt} width={p.image.width} height={p.image.height} loading="lazy" />{p.image.caption ? <figcaption>{p.image.caption}</figcaption> : null}</figure> : null}
    <div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2><p className="cb-intro">{p.intro}</p>{p.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div>
  </Container></section>;
};
export const Faq: SectionComponent<any> = ({ props }) => {
  const p = schemas.faq.parse(props);
  return <section className="cb-section cb-section--surface" id={p.anchor}><Container><div className="cb-section__heading"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2></div><p>{p.intro}</p></div><div className="cb-faq">{p.items.map((item, i) => <details key={i} open={p.openFirst && i === 0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></Container></section>;
};
export const Gallery: SectionComponent<any> = ({ props }) => {
  const p = schemas.gallery.parse(props);
  return <section className="cb-section" id={p.anchor}><Container><div className="cb-section__heading"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2></div><p>{p.intro}</p></div><GalleryViewer items={p.items} columns={p.columns} label={p.heading} /></Container></section>;
};

export const ContactFormSection: SectionComponent<any> = ({ props }) => {
  const p = schemas.contactForm.parse(props);
  return <section className="cb-section cb-section--surface"><Container className="cb-editorial"><div><Eyebrow>{p.eyebrow}</Eyebrow><h2>{p.heading}</h2><p className="cb-intro">{p.intro}</p></div><ContactForm formKey={p.form} /></Container></section>;
};
