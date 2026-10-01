-- SaaS Core v1: account boundary, billing, domains and per-site quota accounting.

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(200),
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(40) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "monthly_price_cents" INTEGER,
    "yearly_price_cents" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'SEK',
    "entitlements" JSONB NOT NULL DEFAULT '{}',
    "stripe_product_id" VARCHAR(255),
    "stripe_price_monthly_id" VARCHAR(255),
    "stripe_price_yearly_id" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "site_id" UUID,
    "provider" VARCHAR(30) NOT NULL DEFAULT 'stripe',
    "provider_customer_id" VARCHAR(255),
    "provider_subscription_id" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL DEFAULT 'trialing',
    "billing_interval" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "current_period_start" TIMESTAMPTZ(3),
    "current_period_end" TIMESTAMPTZ(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(3),
    "trial_ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" UUID NOT NULL,
    "hostname" VARCHAR(253) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'platform',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "primary_domain" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" VARCHAR(255),
    "ssl_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_usage" (
    "site_id" UUID NOT NULL,
    "storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "pages_count" INTEGER NOT NULL DEFAULT 0,
    "submissions_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_usage_pkey" PRIMARY KEY ("site_id")
);

CREATE TABLE "billing_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "subscription_id" UUID,
    "provider" VARCHAR(30) NOT NULL DEFAULT 'stripe',
    "provider_event_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(120) NOT NULL,
    "payload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sites" ADD COLUMN "organization_id" UUID;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");
CREATE UNIQUE INDEX "plans_key_key" ON "plans"("key");
CREATE UNIQUE INDEX "plans_stripe_product_id_key" ON "plans"("stripe_product_id");
CREATE UNIQUE INDEX "plans_stripe_price_monthly_id_key" ON "plans"("stripe_price_monthly_id");
CREATE UNIQUE INDEX "plans_stripe_price_yearly_id_key" ON "plans"("stripe_price_yearly_id");
CREATE UNIQUE INDEX "subscriptions_site_id_key" ON "subscriptions"("site_id");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");
CREATE INDEX "domains_site_id_idx" ON "domains"("site_id");
CREATE INDEX "domains_site_id_primary_domain_idx" ON "domains"("site_id", "primary_domain");
CREATE UNIQUE INDEX "billing_events_provider_event_id_key" ON "billing_events"("provider_event_id");
CREATE INDEX "billing_events_organization_id_idx" ON "billing_events"("organization_id");
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events"("subscription_id");
CREATE INDEX "billing_events_type_idx" ON "billing_events"("type");
CREATE INDEX "billing_events_processed_idx" ON "billing_events"("processed");
CREATE INDEX "sites_organization_id_idx" ON "sites"("organization_id");

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sites"
  ADD CONSTRAINT "sites_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "domains"
  ADD CONSTRAINT "domains_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_usage"
  ADD CONSTRAINT "site_usage_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_events"
  ADD CONSTRAINT "billing_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_events"
  ADD CONSTRAINT "billing_events_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
