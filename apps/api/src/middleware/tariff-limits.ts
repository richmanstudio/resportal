import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { freeLimits, hasPaidTariff, storageLimitFor } from "../lib/tariffs";

export function requireActiveTariff(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    if (!req.organizationId) throw new HttpError(400, "Organization context is required");
    const organization = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!organization) throw new HttpError(404, "Organization not found");
    next();
  })().catch(next);
}

export function requireCaseLimit(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    if (!req.organizationId) throw new HttpError(400, "Organization context is required");
    const organization = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!organization) throw new HttpError(404, "Organization not found");

    const activeCases = await prisma.legalCase.count({
      where: { organizationId: req.organizationId, status: { in: ["draft", "active", "suspended"] } }
    });
    const limit = hasPaidTariff(organization) ? organization.activeCasesLimit : freeLimits.activeCasesLimit;

    if (activeCases >= limit) {
      throw new HttpError(402, "Лимит активных дел бесплатной версии исчерпан. Перейдите на подписку, чтобы продолжить.");
    }
    next();
  })().catch(next);
}

export function requireUserLimit(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    if (!req.organizationId) throw new HttpError(400, "Organization context is required");
    const organization = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!organization) throw new HttpError(404, "Organization not found");

    const members = await prisma.organizationMember.count({
      where: { organizationId: req.organizationId, status: { in: ["active", "invited"] } }
    });
    const effectiveUsersLimit = hasPaidTariff(organization) ? organization.usersLimit : freeLimits.usersLimit;

    if (members >= effectiveUsersLimit) {
      throw new HttpError(402, "Лимит пользователей бесплатной версии исчерпан. Перейдите на Team или Firm.");
    }
    next();
  })().catch(next);
}

export async function assertStorageCapacity(organizationId: string, additionalBytes: number) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new HttpError(404, "Organization not found");

  const used = await prisma.caseDocument.aggregate({
    where: { organizationId },
    _sum: { size: true }
  });
  const limitBytes = storageLimitFor(organization) * 1024 * 1024;
  const usedBytes = used._sum.size ?? 0;

  if (usedBytes + additionalBytes > limitBytes) {
    throw new HttpError(402, "Лимит хранилища вашей версии исчерпан. Освободите место или перейдите на подписку.");
  }
}
