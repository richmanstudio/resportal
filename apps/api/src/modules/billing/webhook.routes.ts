import { Router } from "express";
import { writeAuditLog } from "../../lib/audit";
import { HttpError } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { activatePaidPlan, fetchYooKassaPayment } from "./billing.routes";

export const billingWebhookRouter = Router();

billingWebhookRouter.post("/yookassa", async (req, res, next) => {
  try {
    const event = req.body as {
      event?: string;
      object?: {
        id?: string;
        status?: string;
        paid?: boolean;
        metadata?: Record<string, string>;
      };
    };

    if (!event.object?.id) throw new HttpError(400, "Missing YooKassa payment object");

    const payment = await fetchYooKassaPayment(event.object.id);
    const organizationId = payment.metadata?.organizationId;
    const plan = payment.metadata?.plan as "solo" | "team" | "firm" | undefined;

    if (!organizationId || !plan) throw new HttpError(400, "Payment metadata is incomplete");

    const webhookEvent = await prisma.subscriptionEvent.create({
      data: {
        organizationId,
        type: "webhook_received",
        providerEventId: `${event.event ?? "event"}:${payment.id}`,
        providerPaymentId: payment.id,
        plan,
        metadataJson: { event: event.event, status: payment.status, paid: payment.paid }
      }
    }).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") return null;
      throw error;
    });

    if (!webhookEvent) {
      res.json({ received: true, duplicate: true });
      return;
    }

    await writeAuditLog({
      organizationId,
      entityType: "SubscriptionEvent",
      entityId: payment.id,
      action: "billing.webhook.received",
      metadata: { event: event.event, status: payment.status, paid: payment.paid, plan }
    });

    if (event.event === "payment.succeeded" && payment.status === "succeeded" && payment.paid) {
      await activatePaidPlan(organizationId, plan, payment.id);
      await prisma.subscriptionEvent.create({
        data: {
          organizationId,
          type: "subscription_updated",
          providerPaymentId: payment.id,
          plan,
          metadataJson: { activatedForDays: 30 }
        }
      });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});
