import { Router } from "express";
import { legalCaseCreateSchema, legalCaseListQuerySchema, legalCaseUpdateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { HttpError, notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { requireActiveTariff, requireCaseLimit } from "../../middleware/tariff-limits";

export const casesRouter = Router();

casesRouter.use(requireAuth, requireOrganization);

casesRouter.get("/", async (req, res, next) => {
  try {
    const query = legalCaseListQuerySchema.parse(req.query);
    const search = query.search?.trim();
    const cases = await prisma.legalCase.findMany({
      where: {
        organizationId: req.organizationId,
        status: query.status,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { caseNumber: { contains: search, mode: "insensitive" } },
                { courtName: { contains: search, mode: "insensitive" } },
                { client: { fullName: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: { client: true, responsibleUser: { select: { id: true, fullName: true, email: true } } },
      orderBy: { updatedAt: "desc" }
    });

    res.json(cases);
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/", requireActiveTariff, requireAtLeastRole("lawyer"), requireCaseLimit, async (req, res, next) => {
  try {
    const input = parseBody(legalCaseCreateSchema, req.body);
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId: req.organizationId }
    });

    if (!client) {
      throw new HttpError(422, "Client does not belong to this organization");
    }

    const legalCase = await prisma.legalCase.create({
      data: {
        ...input,
        organizationId: req.organizationId!
      }
    });

    await writeAuditLog({
      req,
      entityType: "LegalCase",
      entityId: legalCase.id,
      action: "case.create",
      metadata: { clientId: legalCase.clientId, status: legalCase.status }
    });

    res.status(201).json(legalCase);
  } catch (error) {
    next(error);
  }
});

casesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const legalCase = await prisma.legalCase.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        client: true,
        parties: true,
        documents: true,
        events: true,
        deadlines: true,
        tasks: true
      }
    });

    if (!legalCase) notFound("Case not found");
    res.json(legalCase);
  } catch (error) {
    next(error);
  }
});

casesRouter.patch("/:id", requireAtLeastRole("lawyer"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = parseBody(legalCaseUpdateSchema, req.body);
    const existing = await prisma.legalCase.findFirst({
      where: { id, organizationId: req.organizationId }
    });

    if (!existing) notFound("Case not found");

    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, organizationId: req.organizationId }
      });
      if (!client) throw new HttpError(422, "Client does not belong to this organization");
    }

    const legalCase = await prisma.legalCase.update({
      where: { id },
      data: input
    });

    await writeAuditLog({
      req,
      entityType: "LegalCase",
      entityId: legalCase.id,
      action: "case.update",
      metadata: { fields: Object.keys(input) }
    });

    res.json(legalCase);
  } catch (error) {
    next(error);
  }
});

casesRouter.delete("/:id", requireAtLeastRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const legalCase = await prisma.legalCase.update({
      where: { id, organizationId: req.organizationId },
      data: { status: "archived", archivedAt: new Date() }
    });

    await writeAuditLog({
      req,
      entityType: "LegalCase",
      entityId: legalCase.id,
      action: "case.archive"
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
