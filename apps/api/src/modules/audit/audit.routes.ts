import { Router } from "express";
import { auditLogQuerySchema } from "@resportal/shared";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireRole } from "../../middleware/roles";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireOrganization);

auditRouter.get("/", requireRole(["owner", "admin"]), async (req, res, next) => {
  try {
    const query = auditLogQuerySchema.parse(req.query);
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: req.organizationId,
        entityType: query.entityType,
        entityId: query.entityId
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: query.limit
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});
