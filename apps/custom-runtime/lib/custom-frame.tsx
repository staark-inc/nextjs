import type { ReactNode } from "react";
import type { SiteSettings } from "@staark/core";
import type { LoadedCustomProject } from "@staark/custom";
import { presetToCssVars, resolvePreset } from "@staark/theme-kit";
import { CustomSiteHeader, CustomSiteFooter } from "@staark/theme-custom-base";
import { BlogConfigSchema } from "@staark/addon-blog/config";
import { resolveCustomTheme } from "./custom-theme";
import { resolveCustomLayouts } from "./custom-layouts";
import { resolveCustomStyles } from "./custom-styles";
import { customProjectLayouts } from "@/project/layouts";
import { customProjectStyles } from "@/project/styles";

export function CustomProjectFrame({ project, site, children }: { project: LoadedCustomProject; site: SiteSettings; children: ReactNode }) {
  const { theme, registry } = resolveCustomTheme(project);
  const baseChrome = project.runtime.config.theme.family === "custom-base" || Object.values(registry).some(item => item.id === "custom-base");
  const layouts = resolveCustomLayouts(project, customProjectLayouts);
  const styles = resolveCustomStyles(project, customProjectStyles);
  const Header = layouts.header;
  const Footer = layouts.footer;
  const Shell = layouts.page;
  const enabledBlog = project.runtime.config.addons.find(addon => addon.key === "blog" && addon.enabled);
  const blog = enabledBlog ? BlogConfigSchema.parse(enabledBlog.config) : null;
  const body = <div className={baseChrome ? "cb-root" : undefined} style={presetToCssVars(resolvePreset(theme), site.theme.overrides)} data-staark-custom-styles={styles ? "true" : undefined}>
    {styles ? <style dangerouslySetInnerHTML={{ __html: styles.css }} /> : null}
    {Header ? <Header project={project} /> : baseChrome ? <CustomSiteHeader site={site} extraLinks={blog ? [{ label: blog.title, href: blog.basePath }] : []} /> : null}
    {children}
    {Footer ? <Footer project={project} /> : baseChrome ? <CustomSiteFooter site={site} /> : null}
  </div>;
  return Shell ? <Shell project={project}>{body}</Shell> : body;
}
