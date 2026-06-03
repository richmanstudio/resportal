import type { TariffPlan } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { writeAuditLog } from "../../lib/audit";
import { config } from "../../lib/config";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { freePlan, limitsForPlan } from "../../lib/tariffs";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireRole } from "../../middleware/roles";

const checkoutSchema = z.object({
  plan: z.enum(["solo", "team", "firm"])
});

const tariffPrices: Record<TariffPlan, number> = {
  solo: 990,
  team: 3990,
  firm: 7990
};

export const billingRouter = Router();

billingRouter.use(requireAuth, requireOrganization);

billingRouter.get("/plans", (_req, res) => {
  res.json([
    freePlan,
    {
      plan: "solo",
      title: "Solo",
      price: tariffPrices.solo,
      usersLimit: 1,
      activeCasesLimit: 30,
      storageLimit: 5120,
      recommended: false,
      description: "Для частнопрактикующего юриста",
      features: ["1 пользователь", "До 30 активных дел", "5 ГБ документов", "Шаблоны документов", "Полный календарь, задачи и сроки"]
    },
    {
      plan: "team",
      title: "Team",
      price: tariffPrices.team,
      usersLimit: 5,
      activeCasesLimit: 150,
      storageLimit: 30720,
      recommended: true,
      description: "Чаще всего выбирают небольшие юридические команды",
      features: ["До 5 пользователей", "До 150 активных дел", "30 ГБ документов", "Командные роли и приглашения", "Журнал действий для владельца и админа"]
    },
    {
      plan: "firm",
      title: "Firm",
      price: tariffPrices.firm,
      usersLimit: 20,
      activeCasesLimit: 500,
      storageLimit: 102400,
      recommended: false,
      description: "Для юридической фирмы с распределенной нагрузкой",
      features: ["До 20 пользователей", "До 500 активных дел", "100 ГБ документов", "Расширенная командная работа", "Приоритетная поддержка"]
    }
  ]);
});

billingRouter.get("/subscription", async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: {
        tariffPlan: true,
        tariffStatus: true,
        tariffCurrentPeriodEnd: true,
        usersLimit: true,
        activeCasesLimit: true,
        storageLimit: true,
        paymentProvider: true,
        providerCustomerId: true,
        providerSubscriptionId: true
      }
    });
    res.json(organization);
  } catch (error) {
    next(error);
  }
});

billingRouter.post("/checkout", requireRole(["owner", "admin"]), async (req, res, next) => {
  try {
    const input = parseBody(checkoutSchema, req.body);

    if (!config.yookassaShopId || !config.yookassaSecretKey) {
      throw new HttpError(503, "Покупка подписки не настроена: добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env.");
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      include: { owner: true }
    });
    if (!organization) throw new HttpError(404, "Organization not found");

    const payment = await createYooKassaPayment({
      amount: tariffPrices[input.plan],
      description: `РЕСПОРТАЛ: тариф ${input.plan} на 1 месяц`,
      returnUrl: config.billingReturnUrl,
      metadata: {
        organizationId: organization.id,
        plan: input.plan,
        ownerEmail: organization.owner.email
      }
    });

    await prisma.subscriptionEvent.create({
      data: {
        organizationId: organization.id,
        type: "checkout_created",
        providerPaymentId: payment.id,
        plan: input.plan,
        metadataJson: payment
      }
    });

    await writeAuditLog({
      req,
      entityType: "SubscriptionEvent",
      entityId: payment.id,
      action: "billing.checkout.create",
      metadata: { plan: input.plan, amount: tariffPrices[input.plan] }
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) throw new HttpError(502, "YooKassa не вернула ссылку оплаты.");

    res.json({ url: confirmationUrl });
  } catch (error) {
    next(error);
  }
});

billingRouter.post("/portal", requireRole(["owner", "admin"]), async (_req, _res, next) => {
  next(new HttpError(501, "Личный кабинет управления подпиской будет добавлен после подключения рекуррентных платежей YooKassa."));
});

type YooKassaPayment = {
  id: string;
  status: string;
  paid?: boolean;
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
};

async function createYooKassaPayment(input: {
  amount: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<YooKassaPayment> {
  const auth = Buffer.from(`${config.yookassaShopId}:${config.yookassaSecretKey}`).toString("base64");
  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotence-Key": randomUUID()
    },
    body: JSON.stringify({
      amount: {
        value: input.amount.toFixed(2),
        currency: "RUB"
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl
      },
      description: input.description,
      metadata: input.metadata
    })
  });

  const body = (await response.json()) as YooKassaPayment & { description?: string };
  if (!response.ok) {
    throw new HttpError(502, body.description ?? "YooKassa payment creation failed");
  }

  return body;
}

export async function fetchYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  if (!config.yookassaShopId || !config.yookassaSecretKey) {
    throw new HttpError(503, "YooKassa is not configured");
  }

  const auth = Buffer.from(`${config.yookassaShopId}:${config.yookassaSecretKey}`).toString("base64");
  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const body = (await response.json()) as YooKassaPayment;
  if (!response.ok) throw new HttpError(502, "YooKassa payment lookup failed");
  return body;
}

export async function activatePaidPlan(organizationId: string, plan: TariffPlan, providerPaymentId: string) {
  const limits = limitsForPlan(plan);
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      tariffPlan: plan,
      tariffStatus: "active",
      paymentProvider: "yookassa",
      providerSubscriptionId: providerPaymentId,
      tariffCurrentPeriodEnd: currentPeriodEnd,
      ...limits
    }
  });

  await writeAuditLog({
    organizationId,
    entityType: "Organization",
    entityId: organizationId,
    action: "billing.subscription.activate",
    metadata: { plan, providerPaymentId, currentPeriodEnd: currentPeriodEnd.toISOString() }
  });
}
