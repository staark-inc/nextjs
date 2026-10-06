"use client";
import { DefaultError, ErrorSurface } from "@/components/CustomErrorViews";
import { errorReference } from "@/lib/custom-errors";

// Root-layout failures have no trusted project context. Keep an independent fallback.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="sv"><body style={{ margin: 0 }}><ErrorSurface presentation={null}><DefaultError project={{ key: "", name: "Webbplats" }} reset={reset} reference={errorReference(error.digest)} /></ErrorSurface></body></html>;
}
