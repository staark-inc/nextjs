"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mood = "clean" | "soft" | "premium" | "bold" | "minimal";
type BuiltInTheme = { id: string; name: string; presets: string[] };

type RGB = { r: number; g: number; b: number };

const MOODS: Array<{ id: Mood; label: string; description: string }> = [
  { id: "clean", label: "Clean", description: "Bright surfaces and restrained contrast." },
  { id: "soft", label: "Soft", description: "Gentler surfaces and warmer transitions." },
  { id: "premium", label: "Premium", description: "Deeper ink, warm paper and richer accents." },
  { id: "bold", label: "Bold", description: "Stronger primary color and crisp contrast." },
  { id: "minimal", label: "Minimal", description: "Neutral surfaces with the brand color used sparingly." },
];

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({
    r: x.r + (y.r - x.r) * amount,
    g: x.g + (y.g - x.g) * amount,
    b: x.b + (y.b - x.b) * amount,
  });
}

function saturation(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function distance(a: string, b: string): number {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function extractPalette(file: File): Promise<string[]> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read this image."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const size = 96;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight, 1);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map<string, number>();

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3] ?? 0;
      if (alpha < 180) continue;

      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (r > 245 && g > 245 && b > 245) continue;
      if (r < 12 && g < 12 && b < 12) continue;

      const quantized = rgbToHex({
        r: Math.round(r / 24) * 24,
        g: Math.round(g / 24) * 24,
        b: Math.round(b / 24) * 24,
      });
      buckets.set(quantized, (buckets.get(quantized) ?? 0) + 1);
    }

    const ranked = [...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
    const selected: string[] = [];

    for (const hex of ranked) {
      if (selected.every((existing) => distance(existing, hex) > 58)) {
        selected.push(hex);
      }
      if (selected.length === 6) break;
    }

    if (!selected.length) throw new Error("No usable brand colors were found.");
    return selected;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function brandTokens(palette: string[], mood: Mood): Record<string, string> {
  const primary = [...palette].sort((a, b) => {
    const scoreA = saturation(a) * 0.72 + Math.min(luminance(a), 1 - luminance(a)) * 0.28;
    const scoreB = saturation(b) * 0.72 + Math.min(luminance(b), 1 - luminance(b)) * 0.28;
    return scoreB - scoreA;
  })[0] ?? "#2563EB";

  const accent = palette.find((color) => distance(color, primary) > 90) ?? palette[1] ?? primary;

  const moodPaper: Record<Mood, string> = {
    clean: "#FFFFFF",
    soft: "#FCFAF7",
    premium: "#FBF7EF",
    bold: "#FFFFFF",
    minimal: "#FFFFFF",
  };

  const paper = moodPaper[mood];
  const ink =
    mood === "premium"
      ? mix(primary, "#05080D", 0.82)
      : mood === "soft"
        ? mix(primary, "#172033", 0.78)
        : "#0F172A";

  const primaryStrength = mood === "minimal" ? 0.12 : mood === "soft" ? 0.18 : 0.25;
  const surface = mood === "minimal" ? "#F8FAFC" : mix(primary, paper, 0.94);
  const primarySoft = mix(primary, paper, mood === "bold" ? 0.84 : 0.9);
  const primaryDark = mix(primary, "#000000", mood === "bold" ? 0.28 : 0.2);
  const muted = mix(ink, paper, mood === "premium" ? 0.54 : 0.6);
  const line = mix(ink, paper, 0.86);

  return {
    primary,
    primaryDark,
    primarySoft,
    ink,
    muted,
    paper,
    surface,
    white: "#FFFFFF",
    line,
    gold: mood === "premium" ? accent : mix(accent, paper, primaryStrength),
  };
}

export default function BrandDnaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [builtIns, setBuiltIns] = useState<BuiltInTheme[]>([]);
  const [baseTheme, setBaseTheme] = useState("");
  const [basePreset, setBasePreset] = useState("");
  const [name, setName] = useState("Brand Theme");
  const [mood, setMood] = useState<Mood>("clean");
  const [palette, setPalette] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    fetch("/api/admin/themes")
      .then((res) => res.json())
      .then((data) => {
        setBuiltIns(data.themes ?? []);
        setBaseTheme(data.active ?? data.themes?.[0]?.id ?? "light");
      });
  }, []);

  const selectedBase = builtIns.find((theme) => theme.id === baseTheme);

  useEffect(() => {
    if (!selectedBase) return;
    if (!selectedBase.presets.includes(basePreset)) setBasePreset(selectedBase.presets[0] ?? "");
  }, [selectedBase, basePreset]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const colors = useMemo(() => brandTokens(palette, mood), [palette, mood]);

  async function analyze(file: File) {
    setAnalyzing(true);
    try {
      const next = await extractPalette(file);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(URL.createObjectURL(file));
      setPalette(next);
      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      if (baseName) setName(`${baseName.replace(/^./, (letter) => letter.toUpperCase())} Theme`);
    } catch (error) {
      showToast((error as Error).message || "Could not analyze image.", false);
    } finally {
      setAnalyzing(false);
    }
  }

  async function createTheme() {
    if (!palette.length || !basePreset) return;
    setCreating(true);

    const res = await fetch("/api/admin/themes/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        id: slugify(name),
        description: `Brand DNA · ${MOODS.find((item) => item.id === mood)?.label ?? mood}`,
        baseTheme,
        basePreset,
        clonePreset: true,
        tokens: { colors },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      showToast((data as { error?: string }).error ?? "Could not create theme.", false);
      return;
    }

    router.push(`/admin/themes/studio/${(data as { theme: { id: string } }).theme.id}`);
  }

  return (
    <>
      <div className="sa-breadcrumb">
        <a href="/admin">Dashboard</a>
        <span>/</span>
        <a href="/admin/themes/studio">Theme Studio</a>
        <span>/</span>
        <span>Brand DNA</span>
      </div>

      <section className="ts-page-head">
        <div>
          <span className="sa-page-eyebrow">Brand DNA</span>
          <h1 className="sa-h1">Turn a logo into a theme.</h1>
          <p className="sa-subtitle">
            Your image is analyzed locally in the browser. Nothing is uploaded until you create the resulting theme document.
          </p>
        </div>
        <a className="sa-btn sa-btn--ghost" href="/admin/themes/studio">Back to Theme Studio</a>
      </section>

      <div className="ts-brand-grid">
        <section className="sa-card ts-brand-controls">
          <div className="sa-card__header">
            <div>
              <span className="sa-card__eyebrow">Step 1</span>
              <h2>Brand source</h2>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void analyze(file);
              event.currentTarget.value = "";
            }}
          />

          <button className="ts-brand-drop" onClick={() => fileRef.current?.click()}>
            {imageUrl ? <img src={imageUrl} alt="Uploaded brand" /> : <span>Upload logo or brand image</span>}
            <small>{analyzing ? "Analyzing…" : "PNG, JPG, WebP or SVG · analyzed locally"}</small>
          </button>

          {palette.length ? (
            <>
              <div className="ts-brand-palette">
                {palette.map((color) => (
                  <div key={color}>
                    <span style={{ background: color }} />
                    <code>{color}</code>
                  </div>
                ))}
              </div>

              <div className="sa-field">
                <label htmlFor="brand-name">Theme name</label>
                <input id="brand-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>

              <div className="ts-form-row">
                <div className="sa-field">
                  <label htmlFor="brand-base">Base theme</label>
                  <select id="brand-base" value={baseTheme} onChange={(event) => setBaseTheme(event.target.value)}>
                    {builtIns.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
                  </select>
                </div>
                <div className="sa-field">
                  <label htmlFor="brand-preset">Preset</label>
                  <select id="brand-preset" value={basePreset} onChange={(event) => setBasePreset(event.target.value)}>
                    {(selectedBase?.presets ?? []).map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                  </select>
                </div>
              </div>

              <div className="ts-moods">
                <span className="ts-moods__label">Palette mood</span>
                {MOODS.map((item) => (
                  <button
                    key={item.id}
                    className={mood === item.id ? "is-active" : ""}
                    onClick={() => setMood(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>

              <button className="sa-btn sa-btn--primary" onClick={() => void createTheme()} disabled={creating}>
                {creating ? "Creating…" : "Create brand theme"}
              </button>
            </>
          ) : null}
        </section>

        <section className="ts-brand-preview">
          <div className="ts-brand-preview__label">
            <span>Generated system</span>
            <strong>{MOODS.find((item) => item.id === mood)?.label}</strong>
          </div>

          {palette.length ? (
            <div
              className="ts-brand-canvas"
              style={{
                "--brand-primary": colors.primary,
                "--brand-primary-dark": colors.primaryDark,
                "--brand-primary-soft": colors.primarySoft,
                "--brand-ink": colors.ink,
                "--brand-muted": colors.muted,
                "--brand-paper": colors.paper,
                "--brand-surface": colors.surface,
                "--brand-line": colors.line,
                "--brand-accent": colors.gold,
              } as React.CSSProperties}
            >
              <nav><strong>{name}</strong><span>Services</span><span>About</span><button>Contact</button></nav>
              <div className="ts-brand-hero">
                <small>Generated from your brand</small>
                <h2>One image. A complete visual starting point.</h2>
                <p>Theme Studio converts the dominant colors into a usable hierarchy instead of blindly copying a logo palette.</p>
                <div><button>Primary action</button><button className="secondary">Explore</button></div>
              </div>
              <div className="ts-brand-swatches">
                {Object.entries(colors).slice(0, 8).map(([key, value]) => (
                  <div key={key}>
                    <span style={{ background: value }} />
                    <small>{key}</small>
                    <code>{value}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="ts-brand-empty">
              <strong>Your generated theme will appear here.</strong>
              <span>Upload a logo to extract its Brand DNA.</span>
            </div>
          )}
        </section>
      </div>

      {toast ? <div className={`sa-toast ${toast.ok ? "sa-toast--success" : "sa-toast--error"}`}>{toast.msg}</div> : null}
    </>
  );
}
