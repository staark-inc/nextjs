"use client";
import type { CustomErrorProps, CustomNotFoundProps } from "@/lib/custom-errors";

export function CustomNotFound({ project }: CustomNotFoundProps) {
  return <div className="custom-recovery__content" data-custom-error="custom-demo-404"><a className="custom-recovery__brand" href="/">✳ {project.name}</a><span className="custom-recovery__eyebrow">En liten omväg</span><span className="custom-recovery__code">404.</span><h1>Här tog vägen slut.</h1><p>Sidan du letar efter finns inte här. Vi hjälper dig tillbaka till rätt riktning.</p><div className="custom-recovery__actions"><a className="custom-recovery__action" href="/">Till startsidan →</a><a href="/kontakt">Kontakta oss</a></div></div>;
}
export function CustomError({ project, reset, reference }: CustomErrorProps) {
  return <div className="custom-recovery__content" data-custom-error="custom-demo-error"><a className="custom-recovery__brand" href="/">✳ {project.name}</a><span className="custom-recovery__eyebrow">En paus i flödet</span><span className="custom-recovery__code">✳</span><h1>Vi behöver ett nytt försök.</h1><p>Något hindrade sidan från att laddas. Försök igen eller gå tillbaka till startsidan.</p><div className="custom-recovery__actions"><button className="custom-recovery__action" type="button" onClick={reset}>Försök igen →</button><a href="/">Till startsidan</a></div>{reference ? <p className="custom-recovery__reference">Referens: {reference}</p> : null}</div>;
}
