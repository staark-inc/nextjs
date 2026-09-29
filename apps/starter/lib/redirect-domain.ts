import { randomUUID } from "node:crypto";

export type RedirectStatus = 301 | 302;
export type RedirectSource = "manual" | "page-path-change";

export type RedirectRule = {
  id: string;
  from: string;
  to: string;
  status: RedirectStatus;
  enabled: boolean;
  source: RedirectSource;
  createdAt: string;
  updatedAt: string;
};

export type RedirectIssue = {
  severity: "error" | "warning";
  ruleId?: string;
  message: string;
};

export function normalizeRedirectPath(value: string): string {
  let pathValue = value.trim();
  if (!pathValue.startsWith("/")) {
    throw new Error("Source must start with /.");
  }
  if (pathValue.includes("?") || pathValue.includes("#")) {
    throw new Error("Source cannot contain a query string or hash.");
  }
  if (
    pathValue === "/admin" ||
    pathValue.startsWith("/admin/") ||
    pathValue.startsWith("/api/") ||
    pathValue.startsWith("/_next/") ||
    pathValue.startsWith("/uploads/")
  ) {
    throw new Error("That source path is reserved by the platform.");
  }
  pathValue = pathValue.replace(/\/{2,}/g, "/");
  if (pathValue.length > 1) pathValue = pathValue.replace(/\/+$/, "");
  return pathValue || "/";
}

export function normalizeRedirectTarget(value: string): string {
  const target = value.trim();
  if (!target) throw new Error("Destination cannot be empty.");

  if (target.startsWith("/")) {
    const [pathname, suffix = ""] = target.split(/(?=[?#])/u, 2);
    const normalized = normalizeRedirectPath(pathname ?? "/");
    return `${normalized}${suffix}`;
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("Destination must be an internal path or an http(s) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("External redirects only support http and https.");
  }
  return url.toString();
}

export function internalRedirectTargetPath(target: string): string | null {
  if (!target.startsWith("/")) return null;
  return normalizeRedirectPath(target.split(/[?#]/u, 1)[0] || "/");
}

export function sanitizeRedirectRule(
  input: Partial<RedirectRule>,
  existing?: RedirectRule,
  now = new Date().toISOString(),
): RedirectRule {
  const from = normalizeRedirectPath(String(input.from ?? existing?.from ?? ""));
  const to = normalizeRedirectTarget(String(input.to ?? existing?.to ?? ""));
  const status = Number(input.status ?? existing?.status ?? 301);
  if (status !== 301 && status !== 302) {
    throw new Error("Redirect status must be 301 or 302.");
  }

  if (internalRedirectTargetPath(to) === from) {
    throw new Error("Source and destination cannot be the same path.");
  }

  return {
    id: existing?.id ?? input.id ?? randomUUID(),
    from,
    to,
    status: status as RedirectStatus,
    enabled: input.enabled ?? existing?.enabled ?? true,
    source: existing?.source ?? input.source ?? "manual",
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function inspectRedirects(rules: RedirectRule[]): RedirectIssue[] {
  const issues: RedirectIssue[] = [];
  const enabled = rules.filter((rule) => rule.enabled);
  const bySource = new Map<string, RedirectRule[]>();

  for (const rule of rules) {
    const group = bySource.get(rule.from) ?? [];
    group.push(rule);
    bySource.set(rule.from, group);
  }

  for (const [source, group] of bySource) {
    if (group.length > 1) {
      issues.push({
        severity: "error",
        message: `Duplicate source ${source}. Only one redirect may own a source path.`,
      });
    }
  }

  const active = new Map(enabled.map((rule) => [rule.from, rule]));
  for (const rule of enabled) {
    const targetPath = internalRedirectTargetPath(rule.to);
    if (targetPath && active.has(targetPath)) {
      issues.push({
        severity: "warning",
        ruleId: rule.id,
        message: `${rule.from} creates a redirect chain through ${targetPath}.`,
      });
    }

    const visited = new Set<string>();
    let cursor = rule.from;
    while (active.has(cursor)) {
      if (visited.has(cursor)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Redirect loop detected starting at ${rule.from}.`,
        });
        break;
      }
      visited.add(cursor);
      const next = active.get(cursor)!;
      const nextPath = internalRedirectTargetPath(next.to);
      if (!nextPath) break;
      cursor = nextPath;
    }
  }

  return issues.filter(
    (issue, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.severity === issue.severity &&
          candidate.ruleId === issue.ruleId &&
          candidate.message === issue.message,
      ) === index,
  );
}

export function assertValidRedirects(rules: RedirectRule[]): void {
  const errors = inspectRedirects(rules).filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(errors[0]!.message);
}
