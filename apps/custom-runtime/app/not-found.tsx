import { loadCustomErrorPresentation } from "@/lib/custom-error-presentation";
import { resolveCustomErrorPages } from "@/lib/custom-errors";
import { DefaultNotFound, ErrorSurface } from "@/components/CustomErrorViews";
import { customProjectErrorPages } from "@/project/error-pages";

export default async function NotFound() {
  const presentation = await loadCustomErrorPresentation();
  const NotFoundView = resolveCustomErrorPages(presentation, customProjectErrorPages).notFound ?? DefaultNotFound;
  return <ErrorSurface presentation={presentation}><NotFoundView project={presentation?.project ?? { key: "", name: "Webbplats" }} /></ErrorSurface>;
}
