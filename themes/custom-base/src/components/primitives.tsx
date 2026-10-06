import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cb-container ${className}`}>{children}</div>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="cb-eyebrow">{children}</span>;
}
export function Button({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <a className={`cb-button${secondary ? " cb-button--secondary" : ""}`} href={href}>{children}<span aria-hidden="true">↗</span></a>;
}
