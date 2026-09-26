import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Container, Eyebrow, Button } from "@staark/theme-light";

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  intro: z.string().optional(),
  rooms: z
    .array(
      z.object({
        name: z.string(),
        image: z.string().optional(),
        description: z.string().optional(),
        occupancy: z.string().optional(),
        price: z.string(),
        amenities: z.array(z.string()).default([]),
        href: z.string().optional(),
      }),
    )
    .default([]),
});

/** Room/accommodation listing — image, occupancy, amenities and a price-per-night. */
export const Rooms: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  return (
    <section className="sk-section" id="rum">
      <Container wide>
        <header className="sk-section__head">
          {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
          <h2>{p.heading}</h2>
          {p.intro ? <p className="sk-section__intro">{p.intro}</p> : null}
        </header>
        <div className="sk-rooms">
          {p.rooms.map((room) => (
            <article key={room.name} className="sk-room">
              {room.image ? (
                <div className="sk-room__media">
                  <img src={room.image} alt={room.name} loading="lazy" />
                </div>
              ) : null}
              <div className="sk-room__body">
                <div className="sk-room__head">
                  <h3>{room.name}</h3>
                  <span className="sk-room__price">{room.price}</span>
                </div>
                {room.occupancy ? <p className="sk-room__occupancy">{room.occupancy}</p> : null}
                {room.description ? <p>{room.description}</p> : null}
                {room.amenities.length ? (
                  <ul className="sk-room__amenities">
                    {room.amenities.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : null}
                {room.href ? (
                  <Button href={room.href} variant="ghost" ctx={ctx}>
                    Boka
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};
