import { FormSubmissionSchema, type FormResult } from "@staark/core";
import { checkFormToken, issueFormToken, type StaarkContent } from "@staark/core/server";

/**
 * Public form endpoint → S-Hub Inbox.
 *
 * Mirrors the WordPress forms module's protections: signed time-trap token,
 * honeypot, same-origin check, per-IP/per-form rate limit and a strict field
 * whitelist (contact + booking_* fields). Valid submissions are forwarded to
 * Staark Hub signed with the site secret; the Hub stores them in the Inbox and
 * sends the admin/customer notifications. The site itself never sends mail.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

/** Best-effort in-memory limiter. Serverless instances do not share it; the Hub rate-limits too. */
function rateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_PER_WINDOW;
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function json(body: FormResult, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export type FormsRouteOptions = {
  successMessage?: string;
  /** Override for tests. */
  minSeconds?: number;
};

export function createFormsRoute(content: StaarkContent, options: FormsRouteOptions = {}) {
  return {
    /**
     * GET ?form=<id> → { token }. The form fetches its token on mount, so pages
     * stay fully static/ISR and the time-trap still starts when a visitor opens it.
     */
    async GET(req: Request): Promise<Response> {
      const formId = new URL(req.url).searchParams.get("form") ?? "";
      if (!/^[a-z0-9\-_]{1,64}$/.test(formId)) {
        return Response.json({ ok: false, error: "Unknown form." }, { status: 400 });
      }
      return Response.json(
        { ok: true, token: issueFormToken(formId, content.connection.secret) },
        { headers: { "Cache-Control": "no-store" } },
      );
    },

    async POST(req: Request): Promise<Response> {
      if (!req.headers.get("content-type")?.includes("application/json")) {
        return json({ ok: false, error: "Unsupported request." }, 415);
      }
      if (!sameOrigin(req)) {
        return json({ ok: false, error: "The form must be sent from this website." }, 403);
      }

      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return json({ ok: false, error: "Invalid request." }, 400);
      }

      const parsed = FormSubmissionSchema.safeParse(raw);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          if (issue.path[0] === "fields" && typeof issue.path[1] === "string") {
            fieldErrors[issue.path[1]] = issue.message;
          }
        }
        // A filled honeypot looks like success to the bot but is dropped.
        if (parsed.error.issues.some((i) => i.path[0] === "website")) {
          return json({ ok: true, message: options.successMessage ?? "Tack! Vi återkommer så snart vi kan." }, 200);
        }
        return json({ ok: false, error: "Check the highlighted fields.", fieldErrors }, 422);
      }

      const submission = parsed.data;
      const token = checkFormToken(submission.token, submission.formId, content.connection.secret, {
        minSeconds: options.minSeconds,
      });
      if (!token.ok) {
        const message =
          token.reason === "expired" ? "The form expired. Reload the page and try again." : "The form could not be verified. Reload the page and try again.";
        return json({ ok: false, error: message }, 400);
      }

      if (rateLimited(`${clientIp(req)}|${submission.formId}`)) {
        return json({ ok: false, error: "Too many requests. Try again in a few minutes." }, 429);
      }

      try {
        await content.submitForm({
          formId: submission.formId,
          fields: submission.fields,
          pageUrl: submission.pageUrl,
          meta: { userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300) },
        });
      } catch (error) {
        console.error("[staark] Form forward to Staark Hub failed:", (error as Error).message);
        return json({ ok: false, error: "The message could not be sent right now. Please call or email us instead." }, 502);
      }

      return json({ ok: true, message: options.successMessage ?? "Tack! Vi återkommer så snart vi kan." }, 200);
    },
  };
}
