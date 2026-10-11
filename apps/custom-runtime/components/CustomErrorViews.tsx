"use client";
import type { ReactNode } from "react";
import type { CustomErrorProps, CustomNotFoundProps, CustomErrorPresentation } from "@/lib/custom-errors";
import "./custom-errors.css";

export function ErrorSurface({ presentation, children }: { presentation: CustomErrorPresentation | null; children: ReactNode }) {
  return <main className="custom-recovery" style={presentation?.style}>{children}</main>;
}
export function DefaultNotFound({ project }: CustomNotFoundProps) {
  return <div className="custom-recovery__content" data-custom-error="fallback-404"><a className="custom-recovery__brand" href="/">{project.name}</a><span className="custom-recovery__code">404</span><h1>Sidan kunde inte hittas.</h1><p>Adressen kan ha ändrats eller sidan finns inte längre.</p><a className="custom-recovery__action" href="/">Till startsidan →</a></div>;
}
export function DefaultError({ project, reset, reference }: CustomErrorProps) {
  return <div className="custom-recovery__content" data-custom-error="fallback-error"><a className="custom-recovery__brand" href="/">{project.name}</a><span className="custom-recovery__code">!</span><h1>Något gick fel.</h1><p>Vi kunde inte visa sidan just nu. Försök igen om en stund.</p><div className="custom-recovery__actions"><button className="custom-recovery__action" type="button" onClick={reset}>Försök igen</button><a href="/">Till startsidan →</a></div>{reference ? <p className="custom-recovery__reference">Referens: {reference}</p> : null}</div>;
}
