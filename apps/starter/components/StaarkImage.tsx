import Image from "next/image";
import type { ThemeImageProps } from "@staark/theme-kit";

function isLocalImage(src: string): boolean {
  return src.startsWith("/") && !src.startsWith("//");
}

/**
 * Next.js host adapter for theme images.
 *
 * Themes remain host-agnostic; local images get responsive WebP variants through
 * next/image, while remote images fall back to native <img> unless the deployment
 * explicitly whitelists that remote origin in next.config.ts.
 */
export function StaarkImage({
  src,
  alt,
  className,
  sizes = "100vw",
  fill = false,
  priority = false,
  eager = false,
}: ThemeImageProps) {
  if (!isLocalImage(src) || !fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill
      sizes={sizes}
      quality={82}
      preload={priority}
      {...(!priority && eager ? { loading: "eager" as const } : {})}
      decoding="async"
    />
  );
}
