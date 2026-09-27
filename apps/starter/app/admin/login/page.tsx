"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "../BrandMark";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Invalid username or password.");
      setPassword("");
    }
  }

  return (
    <div className="sa-login">
      <form className="sa-login__card" onSubmit={handleSubmit}>
        <div className="sa-login__logo sa-login__logo--brand"><BrandMark className="sa-login__mark" /></div>
        <h1 className="sa-login__title">Staark Hub</h1>
        <p className="sa-login__subtitle">NextJS Platform · Local administration</p>

        {error && <div className="sa-login__error">{error}</div>}

        <div className="sa-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="sa-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </div>

        <button className="sa-btn sa-btn--primary sa-btn--full" type="submit" disabled={loading || !username || !password}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
