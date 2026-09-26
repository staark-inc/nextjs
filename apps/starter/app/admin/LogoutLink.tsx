"use client";

export default function LogoutLink({ children }: { children: React.ReactNode }) {
  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <a href="/admin/login" data-logout onClick={handleLogout}>
      {children}
    </a>
  );
}
