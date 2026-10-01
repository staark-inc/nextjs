import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

export type StripeSubscriptionPayload = {
  id: string;
  customer: string | { id?: string } | null;
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  trial_end?: number | null;
  items?: {
    data?: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
      price?: {
        id?: string;
        recurring?: {
          interval?: string | null;
        } | null;
      } | null;
    }>;
  };
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  created?: number;
  data: {
    object: StripeSubscriptionPayload | Record<string, unknown>;
  };
};

function requireStripeSecretKey(): string {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return value;
}

export function stripeBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function formBody(
  values: Record<string, string | number | boolean | null | undefined>,
): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    body.set(key, String(value));
  }
  return body;
}

async function stripeRequest<T>(
  path: string,
  init: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
  } = {},
): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requireStripeSecretKey()}`,
      ...(init.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init.body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Stripe request failed with status ${response.status}.`,
    );
  }

  return payload;
}

export async function createStripeCustomer(input: {
  name: string;
  organizationId: string;
  siteId: string;
  siteKey: string;
}): Promise<{ id: string }> {
  return stripeRequest<{ id: string }>("/customers", {
    method: "POST",
    body: formBody({
      name: input.name,
      "metadata[organization_id]": input.organizationId,
      "metadata[site_id]": input.siteId,
      "metadata[site_key]": input.siteKey,
      "metadata[source]": "staark-saas",
    }),
  });
}

export async function createStripePortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ id: string; url: string }> {
  return stripeRequest<{ id: string; url: string }>(
    "/billing_portal/sessions",
    {
      method: "POST",
      body: formBody({
        customer: input.customerId,
        return_url: input.returnUrl,
        configuration:
          process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined,
      }),
    },
  );
}

export async function createStripeProduct(input: {
  name: string;
  description?: string | null;
  planKey: string;
}): Promise<{ id: string }> {
  return stripeRequest<{ id: string }>("/products", {
    method: "POST",
    body: formBody({
      name: input.name,
      description: input.description || undefined,
      "metadata[staark_plan_key]": input.planKey,
    }),
  });
}

export async function createStripeRecurringPrice(input: {
  productId: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  planKey: string;
}): Promise<{ id: string }> {
  return stripeRequest<{ id: string }>("/prices", {
    method: "POST",
    body: formBody({
      product: input.productId,
      unit_amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      "recurring[interval]": input.interval,
      "metadata[staark_plan_key]": input.planKey,
      "metadata[billing_interval]":
        input.interval === "year" ? "yearly" : "monthly",
    }),
  });
}

function parseStripeSignature(
  header: string,
): { timestamp: number; signatures: string[] } {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = Number(
    parts.find((part) => part.startsWith("t="))?.slice(2),
  );
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!Number.isFinite(timestamp) || !signatures.length) {
    throw new Error("Invalid Stripe-Signature header.");
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): StripeWebhookEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  if (!signatureHeader) {
    throw new Error("Missing Stripe-Signature header.");
  }

  const parsed = parseStripeSignature(signatureHeader);
  if (Math.abs(nowSeconds - parsed.timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Stripe webhook timestamp is outside the allowed window.");
  }

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = parsed.signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const actualBuffer = Buffer.from(signature, "hex");
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });

  if (!valid) {
    throw new Error("Stripe webhook signature verification failed.");
  }

  return JSON.parse(rawBody) as StripeWebhookEvent;
}

export function stripeCustomerId(
  value: StripeSubscriptionPayload["customer"],
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

export function stripeSubscriptionPriceId(
  subscription: StripeSubscriptionPayload,
): string | null {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return typeof priceId === "string" && priceId ? priceId : null;
}

export function stripeSubscriptionInterval(
  subscription: StripeSubscriptionPayload,
): string {
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  return interval === "year" ? "yearly" : "monthly";
}

export function stripeSubscriptionPeriod(
  subscription: StripeSubscriptionPayload,
): { start: Date | null; end: Date | null } {
  const item = subscription.items?.data?.[0];
  return {
    start:
      typeof item?.current_period_start === "number"
        ? new Date(item.current_period_start * 1000)
        : null,
    end:
      typeof item?.current_period_end === "number"
        ? new Date(item.current_period_end * 1000)
        : null,
  };
}

export function stripeUnixDate(value: number | null | undefined): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}
