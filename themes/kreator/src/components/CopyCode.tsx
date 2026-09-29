"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A promo code with a copy button. Falls back to selecting the text when the
 * Clipboard API is unavailable (older browsers, non-secure origins).
 */
export function CopyCode({ code, copyLabel = "Copiază", copiedLabel = "Copiat!", size = "md" }: { code: string; copyLabel?: string; copiedLabel?: string; size?: "md" | "lg" }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      const el = textRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        ok = document.execCommand?.("copy") ?? false;
      }
    }
    if (ok) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <span className={`sk-kr-code sk-kr-code--${size}`} data-copied={copied || undefined}>
      <code ref={textRef}>{code}</code>
      <button type="button" onClick={copy} aria-label={`${copyLabel}: ${code}`}>
        {copied ? copiedLabel : copyLabel}
      </button>
      <span className="sk-kr-sr" aria-live="polite">
        {copied ? `${code} ${copiedLabel}` : ""}
      </span>
    </span>
  );
}
