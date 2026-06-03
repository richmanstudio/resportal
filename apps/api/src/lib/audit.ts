import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { logger } from "./logger";
import { prisma } from "./prisma";

type AuditInput = {
  req?: Request;
  organizationId?: string | null;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonObject;
};

export async function writeAuditLog(input: AuditInput) {
  const organizationId = input.organizationId ?? input.req?.organizationId ?? null;
  const userId = input.userId ?? input.req?.user?.id ?? null;

  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadataJson: input.metadata,
        ip: input.req?.ip,
        userAgent: input.req?.header("user-agent")
      }
    });
  } catch (error) {
    logger.warn("Audit log write failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
