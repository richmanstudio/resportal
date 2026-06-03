import { Router } from "express";
import { caseEventCreateSchema } from "@resportal/shared";
import { notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { requireActiveTariff } from "../../middleware/tariff-limits";

export const eventsRouter = Router();

eventsRouter.use(requireAuth, requireOrganization);

eventsRouter.get("/", async (req, res, next) => {
  try {
    const events = await prisma.caseEvent.findMany({
      where: { organizationId: req.organizationId },
      include: { case: { select: { id: true, title: true, caseNumber: true } }, responsibleUser: { select: { id: true, fullName: true } } },
      orderBy: { startAt: "asc" }
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

eventsRouter.post("/", requireActiveTariff, requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(caseEventCreateSchema, req.body);
    const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
    if (!legalCase) notFound("Case not found");

    const event = await prisma.caseEvent.create({
      data: {
        ...input,
        type: input.type ?? "other",
        isAllDay: input.isAllDay ?? false,
        organizationId: req.organizationId!,
        createdById: req.user!.id
      }
    });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});
