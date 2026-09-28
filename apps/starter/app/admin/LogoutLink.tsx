"use client";

type LogoutLinkProps = {
  children: React.ReactNode;
  className?: string;
  /** Accessible name when the link shows only an icon. */
  label?: string;
};

export default function LogoutLink({ children, className, label }: LogoutLinkProps) {
  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <a href="/admin/login" data-logout onClick={handleLogout} className={className} aria-label={label} title={label}>
      {children}
    </a>
  );
}
