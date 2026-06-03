import type { TariffPlan } from "@prisma/client";

export const freeLimits = { usersLimit: 1, activeCasesLimit: 3, storageLimit: 512 };
export const freePlan = {
  plan: "free",
  title: "Free",
  price: 0,
  usersLimit: freeLimits.usersLimit,
  activeCasesLimit: freeLimits.activeCasesLimit,
  storageLimit: freeLimits.storageLimit,
  recommended: false,
  description: "Для первого знакомства с продуктом",
  features: ["1 пользователь", "До 3 активных дел", "512 МБ документов", "Клиенты, дела, задачи, календарь и документы", "Без приглашения команды"]
};

export const tariffLimits: Record<TariffPlan, { usersLimit: number; activeCasesLimit: number; storageLimit: number }> = {
  solo: { usersLimit: 1, activeCasesLimit: 30, storageLimit: 5120 },
  team: { usersLimit: 5, activeCasesLimit: 150, storageLimit: 30720 },
  firm: { usersLimit: 20, activeCasesLimit: 500, storageLimit: 102400 }
};

export function limitsForPlan(plan: TariffPlan) {
  return tariffLimits[plan];
}

export function hasPaidTariff(input: { tariffStatus: string; tariffCurrentPeriodEnd: Date | null }) {
  return input.tariffStatus === "active" && Boolean(input.tariffCurrentPeriodEnd);
}

export function storageLimitFor(input: { tariffStatus: string; tariffCurrentPeriodEnd: Date | null; storageLimit: number }) {
  return hasPaidTariff(input) ? input.storageLimit : freeLimits.storageLimit;
}
