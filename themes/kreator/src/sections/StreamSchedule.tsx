import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container } from "@staark/theme-light";
import { SectionHead } from "../components/shared";
import { ScheduleList } from "../components/ScheduleList";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  /** Seven rows, Monday first, so today's row can be marked. */
  days: z
    .array(
      z.object({
        day: z.string(),
        time: z.string().optional(),
        title: z.string().optional(),
        platform: z.string().optional(),
        off: z.boolean().default(false),
      }),
    )
    .default([]),
  /** IANA time zone the times are given in, e.g. "Europe/Bucharest". */
  timeZone: z.string().default("Europe/Stockholm"),
  timeZoneLabel: z.string().optional(),
  todayLabel: z.string().default("azi"),
  offLabel: z.string().default("Pauză"),
  note: z.string().optional(),
});

/**
 * Stream schedule — the week at a glance, Monday first, with today's row
 * highlighted in the creator's time zone. Block type: "streamSchedule".
 */
export const StreamSchedule: SectionComponent<z.infer<typeof schema>> = ({ props }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section sk-kr-schedule-section" id="program">
      <Container>
        <div className="sk-kr-schedule-section__grid">
          <div>
            <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
            {p.timeZoneLabel ? <p className="sk-kr-fine">{p.timeZoneLabel}</p> : null}
            {p.note ? <p className="sk-kr-fine">{p.note}</p> : null}
          </div>
          <ScheduleList days={p.days} timeZone={p.timeZone} todayLabel={p.todayLabel} offLabel={p.offLabel} />
        </div>
      </Container>
    </section>
  );
};
