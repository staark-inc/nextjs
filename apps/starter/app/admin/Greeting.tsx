"use client";

import { useEffect, useState } from "react";

function greet(hour: number, swedish: boolean): string {
  if (swedish) return hour < 10 ? "God morgon" : hour < 18 ? "Hej" : "God kväll";
  return hour < 12 ? "Good morning" : hour < 18 ? "Hello" : "Good evening";
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Date and greeting in the viewer's own time zone. The server render uses the
 * server clock; the browser corrects it after hydration.
 */
export default function Greeting({ name, locale, serverNow }: { name: string; locale: string; serverNow: number }) {
  const swedish = locale.toLowerCase().startsWith("sv");
  const [now, setNow] = useState(() => new Date(serverNow));

  useEffect(() => {
    setNow(new Date());
  }, []);

  return (
    <>
      <span className="sa-page-eyebrow">{dateLabel(now)}</span>
      <h1 className="sa-h1">
        {greet(now.getHours(), swedish)}, {name}
      </h1>
    </>
  );
}
