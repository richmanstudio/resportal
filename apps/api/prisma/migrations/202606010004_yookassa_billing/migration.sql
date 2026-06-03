ALTER TABLE "Organization" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
ALTER TABLE "Organization" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";
ALTER TABLE "Organization" ADD COLUMN "paymentProvider" TEXT;

ALTER TABLE "SubscriptionEvent" RENAME COLUMN "stripeEventId" TO "providerEventId";
ALTER TABLE "SubscriptionEvent" RENAME COLUMN "stripeSessionId" TO "providerPaymentId";
ALTER TABLE "SubscriptionEvent" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";

ALTER INDEX "SubscriptionEvent_stripeEventId_key" RENAME TO "SubscriptionEvent_providerEventId_key";
