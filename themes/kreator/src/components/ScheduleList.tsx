"use client";

import { useEffect, useState } from "react";
import { weekdayIndex } from "../platform";

export type ScheduleDay = { day: string; time?: string; title?: string; platform?: string; off: boolean };

/** Weekly schedule; after hydration today's row (in the creator's time zone) is marked. */
export function ScheduleList({ days, timeZone, todayLabel, offLabel }: { days: ScheduleDay[]; timeZone: string; todayLabel: string; offLabel: string }) {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(weekdayIndex(new Date(), timeZone)), [timeZone]);

  return (
    <ol className="sk-kr-schedule">
      {days.map((d, i) => (
        <li key={`${d.day}-${i}`} className="sk-kr-schedule__row" data-off={d.off || undefined} aria-current={today === i ? "date" : undefined}>
          <span className="sk-kr-schedule__day">
            {d.day}
            {today === i ? <em>{todayLabel}</em> : null}
          </span>
          {d.off ? (
            <span className="sk-kr-schedule__off">{offLabel}</span>
          ) : (
            <>
              <span className="sk-kr-schedule__time">{d.time}</span>
              <span className="sk-kr-schedule__title">{d.title}</span>
              {d.platform ? <span className="sk-kr-schedule__platform">{d.platform}</span> : <span />}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
