import { z } from "zod";
import type { SectionComponent } from "@staark/theme-kit";
import { Button, Container, Eyebrow, optionalLinkSchema } from "../components/primitives";

const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
});

const schema = z.object({
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  text: z.string().optional(),
  image: imageSchema.optional(),
  imagePosition: z.enum(["left", "right", "top", "background"]).default("right"),
  primaryCta: optionalLinkSchema,
  secondaryCta: optionalLinkSchema,
  alignment: z.enum(["left", "center", "right"]).default("left"),
  width: z.enum(["narrow", "normal", "wide"]).default("normal"),
  background: z.enum(["default", "surface", "accent", "dark", "gradient"]).default("default"),
});

export const Freeform: SectionComponent<z.infer<typeof schema>> = ({ props, ctx }) => {
  const p = schema.parse(props);
  const hasImage = Boolean(p.image?.src);
  const backgroundImage = hasImage && p.imagePosition === "background";
  const HostImage = ctx.image;
  const blockIndex = ctx.blockIndex ?? Number.POSITIVE_INFINITY;
  const priority = blockIndex <= 1;
  const eager = blockIndex <= 2;
  const classes = [
    "sk-freeform",
    `sk-freeform--align-${p.alignment}`,
    `sk-freeform--width-${p.width}`,
    `sk-freeform--bg-${p.background}`,
    hasImage ? `sk-freeform--image-${p.imagePosition}` : "sk-freeform--no-image",
  ].join(" ");

  return (
    <section className={classes}>
      {backgroundImage && p.image ? (
        HostImage ? (
          <HostImage
            className="sk-freeform__background"
            src={p.image.src}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            eager={eager}
          />
        ) : (
          <img
            className="sk-freeform__background"
            src={p.image.src}
            alt=""
            aria-hidden
            loading={eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
        )
      ) : null}
      <Container wide={p.width === "wide"}>
        <div className="sk-freeform__inner">
          {hasImage && !backgroundImage && p.image ? (
            <div
              className="sk-freeform__media"
              style={HostImage ? { position: "relative", aspectRatio: "4 / 3", overflow: "hidden" } : undefined}
            >
              {HostImage ? (
                <HostImage
                  src={p.image.src}
                  alt={p.image.alt}
                  fill
                  sizes="(max-width: 860px) calc(100vw - 48px), 46vw"
                  priority={priority}
                  eager={eager}
                />
              ) : (
                <img
                  src={p.image.src}
                  alt={p.image.alt}
                  loading={eager ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : undefined}
                  decoding="async"
                />
              )}
            </div>
          ) : null}

          <div className="sk-freeform__copy">
            {p.eyebrow ? <Eyebrow>{p.eyebrow}</Eyebrow> : null}
            {p.heading ? <h2>{p.heading}</h2> : null}
            {p.text ? <p className="sk-freeform__text">{p.text}</p> : null}
            {p.primaryCta || p.secondaryCta ? (
              <div className="sk-freeform__actions">
                {p.primaryCta ? (
                  <Button href={p.primaryCta.href} ctx={ctx}>{p.primaryCta.label}</Button>
                ) : null}
                {p.secondaryCta ? (
                  <Button href={p.secondaryCta.href} variant="ghost" ctx={ctx}>{p.secondaryCta.label}</Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
};
