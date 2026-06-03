import { Router } from "express";
import { casePartyCreateSchema, casePartyUpdateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";

export const casePartiesRouter = Router();

casePartiesRouter.use(requireAuth, requireOrganization);

casePartiesRouter.get("/case/:caseId", async (req, res, next) => {
  try {
    const legalCase = await prisma.legalCase.findFirst({
      where: { id: req.params.caseId, organizationId: req.organizationId }
    });
    if (!legalCase) notFound("Case not found");

    const parties = await prisma.caseParty.findMany({
      where: { caseId: req.params.caseId },
      orderBy: { id: "asc" }
    });
    res.json(parties);
  } catch (error) {
    next(error);
  }
});

casePartiesRouter.post("/case/:caseId", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const caseId = req.params.caseId as string;
    const input = parseBody(casePartyCreateSchema, req.body);
    const legalCase = await prisma.legalCase.findFirst({
      where: { id: caseId, organizationId: req.organizationId }
    });
    if (!legalCase) notFound("Case not found");

    const party = await prisma.caseParty.create({
      data: { ...input, type: input.type ?? "other", caseId }
    });

    await writeAuditLog({
      req,
      entityType: "CaseParty",
      entityId: party.id,
      action: "case_party.create",
      metadata: { caseId, type: party.type }
    });

    res.status(201).json(party);
  } catch (error) {
    next(error);
  }
});

casePartiesRouter.patch("/:id", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = parseBody(casePartyUpdateSchema, req.body);
    const existing = await prisma.caseParty.findUnique({ where: { id }, include: { case: true } });
    if (!existing || existing.case.organizationId !== req.organizationId) notFound("Party not found");

    const party = await prisma.caseParty.update({
      where: { id },
      data: input
    });

    await writeAuditLog({
      req,
      entityType: "CaseParty",
      entityId: party.id,
      action: "case_party.update",
      metadata: { caseId: existing.caseId, fields: Object.keys(input) }
    });

    res.json(party);
  } catch (error) {
    next(error);
  }
});

casePartiesRouter.delete("/:id", requireAtLeastRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const party = await prisma.caseParty.findUnique({ where: { id }, include: { case: true } });
    if (!party || party.case.organizationId !== req.organizationId) notFound("Party not found");
    await prisma.caseParty.delete({ where: { id } });
    await writeAuditLog({
      req,
      entityType: "CaseParty",
      entityId: id,
      action: "case_party.delete",
      metadata: { caseId: party.caseId, type: party.type }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
