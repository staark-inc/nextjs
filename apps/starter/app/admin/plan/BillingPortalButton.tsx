"use client";

import { useState } from "react";

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/billing/portal", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not open billing management.");
      }

      window.location.assign(data.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not open billing management.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="sa-plan-billing-actions">
      <button
        type="button"
        className="sa-btn sa-btn--primary"
        onClick={() => void openPortal()}
        disabled={loading}
      >
        {loading ? "Opening…" : "Manage billing"}
      </button>
      {error ? <span className="sa-plan-billing-error">{error}</span> : null}
    </div>
  );
}
