import type {
  CustomPageShellProps,
} from "@/lib/custom-layouts";

export function CustomPageShell({
  children,
}: CustomPageShellProps) {
  return (
    <div
      data-staark-layout="custom"
      style={{
        minHeight:
          "100vh",

        background:
          "#fff",
      }}
    >
      {children}
    </div>
  );
}
