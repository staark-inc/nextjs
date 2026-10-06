import type {
  SectionComponent,
} from "@staark/theme-kit";

type CustomHeroProps = {
  eyebrow?: string;
  heading?: string;
  intro?: string;
};

export const CustomHero:
  SectionComponent<CustomHeroProps> = ({
    props,
  }) => {
    return (
      <section
        style={{
          padding:
            "120px 24px",

          background:
            "linear-gradient(135deg, #0b0d10, #171c24)",

          color:
            "white",
        }}
      >
        <div
          style={{
            maxWidth:
              1100,

            margin:
              "0 auto",
          }}
        >
          {props.eyebrow ? (
            <div
              style={{
                opacity:
                  0.65,

                marginBottom:
                  16,

                textTransform:
                  "uppercase",

                letterSpacing:
                  "0.12em",
              }}
            >
              {
                props.eyebrow
              }
            </div>
          ) : null}

          <h1
            style={{
              maxWidth:
                850,

              fontSize:
                "clamp(48px, 8vw, 96px)",

              lineHeight:
                0.95,

              margin:
                0,
            }}
          >
            {
              props.heading ??
              "Custom project"
            }
          </h1>

          {props.intro ? (
            <p
              style={{
                maxWidth:
                  680,

                marginTop:
                  28,

                fontSize:
                  20,

                lineHeight:
                  1.6,

                opacity:
                  0.75,
              }}
            >
              {
                props.intro
              }
            </p>
          ) : null}
        </div>
      </section>
    );
  };
