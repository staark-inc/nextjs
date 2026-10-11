"use client";
import { useCustomErrorPresentation } from "@/components/CustomErrorContext";
import { DefaultError, ErrorSurface } from "@/components/CustomErrorViews";
import { errorReference, resolveCustomErrorPages } from "@/lib/custom-errors";
import { customProjectErrorPages } from "@/project/error-pages";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const presentation = useCustomErrorPresentation();
  const ErrorView = resolveCustomErrorPages(presentation, customProjectErrorPages).error ?? DefaultError;
  return <ErrorSurface presentation={presentation}><ErrorView project={presentation?.project ?? { key: "", name: "Webbplats" }} reset={reset} reference={errorReference(error.digest)} /></ErrorSurface>;
}
