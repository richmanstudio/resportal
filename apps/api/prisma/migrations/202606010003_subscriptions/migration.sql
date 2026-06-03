CREATE TYPE "SubscriptionEventType" AS ENUM ('checkout_created', 'checkout_completed', 'portal_created', 'webhook_received', 'subscription_updated', 'subscription_cancelled');

ALTER TABLE "Organization"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "tariffCurrentPeriodEnd" TIMESTAMP(3);

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "SubscriptionEventType" NOT NULL,
  "stripeEventId" TEXT,
  "stripeSessionId" TEXT,
  "stripeSubscriptionId" TEXT,
  "plan" "TariffPlan",
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionEvent_organizationId_idx" ON "SubscriptionEvent"("organizationId");
CREATE UNIQUE INDEX "SubscriptionEvent_stripeEventId_key" ON "SubscriptionEvent"("stripeEventId");
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
