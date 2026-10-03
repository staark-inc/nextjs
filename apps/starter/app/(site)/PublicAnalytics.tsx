"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PublicAnalytics({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !pathname) return;

    void fetch("/api/staark/analytics", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        path: pathname,
      }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // Analytics must never affect the public website experience.
    });
  }, [enabled, pathname]);

  return null;
}
