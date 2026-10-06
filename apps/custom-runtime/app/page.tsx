import { resolveCustomServices } from "@/lib/custom-services";
import {
  SiteSettingsSchema,
  type Block,
} from "@staark/core";

import {
  BlockRenderer,
  presetToCssVars,
  resolvePreset,
} from "@staark/theme-kit";

import {
  loadActiveCustomProject,
} from "@/lib/custom-project";

import {
  resolveCustomTheme,
} from "@/lib/custom-theme";

import {
  resolveCustomLayouts,
} from "@/lib/custom-layouts";

import {
  customProjectLayouts,
} from "@/project/layouts";

import {
  resolveCustomStyles,
} from "@/lib/custom-styles";

import {
  customProjectStyles,
} from "@/project/styles";

export const dynamic =
  "force-dynamic";

export default async function Page() {
  const project =
    await loadActiveCustomProject();

  const services = resolveCustomServices(project);
  const { theme, registry } = resolveCustomTheme(project, services.extensions.sections);

  const layouts =
    resolveCustomLayouts(
      project,
      customProjectLayouts,
    );

  const styles =
    resolveCustomStyles(
      project,
      customProjectStyles,
    );

  const Header =
    layouts.header;

  const Footer =
    layouts.footer;

  const PageShell =
    layouts.page;

  const site =
    SiteSettingsSchema.parse({
      name:
        project.project.name,

      websiteType:
        "custom",

      locale:
        "sv-SE",

      url:
        "http://localhost:3300",

      theme: {
        family: project.runtime.config.theme.family,
        preset: project.runtime.config.theme.variant,
      },
    });

  const blocks:
    Block[] = [
      {
        id:
          "custom-hero",

        type:
          "hero",

        props: {
          eyebrow:
            "Staark Custom",

          heading:
            project.project.name,

          intro:
            "This page is rendered through the Staark theme runtime with a Custom component override.",
        },
      },
      {
        id:
          "custom-services",

        type:
          "services",

        props: {
          heading:
            "Custom composition works",

          intro:
            "This section comes directly from the base Light theme.",
        },
      },
    ];

  const content = (
    <main>
      <BlockRenderer
        blocks={
          blocks
        }

        site={
          site
        }

        theme={
          theme
        }

        registry={registry}
      />
    </main>
  );

  const body = (
    <>

      {styles ? (
        <style
          dangerouslySetInnerHTML={{
            __html:
              styles.css,
          }}
        />
      ) : null}
      {Header ? <Header project={project} /> : null}
      {content}
      {Footer ? <Footer project={project} /> : null}
    </>
  );

  const rendered = (
    <div
      style={presetToCssVars(resolvePreset(theme, project.runtime.config.theme.variant))}
      data-staark-custom-styles={
        styles
          ? "true"
          : undefined
      }
    >
      {body}
    </div>
  );

  return PageShell ? (
    <PageShell
      project={project}
    >
      {rendered}
    </PageShell>
  ) : rendered;
}
