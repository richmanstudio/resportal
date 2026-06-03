import { Router } from "express";
import { clientCreateSchema, clientListQuerySchema, clientUpdateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { HttpError, notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { requireActiveTariff } from "../../middleware/tariff-limits";

export const clientsRouter = Router();

clientsRouter.use(requireAuth, requireOrganization);

clientsRouter.get("/", async (req, res, next) => {
  try {
    const query = clientListQuerySchema.parse(req.query);
    const search = query.search?.trim();
    const clients = await prisma.client.findMany({
      where: {
        organizationId: req.organizationId,
        type: query.type,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { shortName: { contains: search, mode: "insensitive" } },
                { inn: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { updatedAt: "desc" }
    });

    res.json(clients);
  } catch (error) {
    next(error);
  }
});

clientsRouter.post("/", requireActiveTariff, requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(clientCreateSchema, req.body);

    const client = await prisma.client.create({
      data: {
        ...input,
        organizationId: req.organizationId!
      }
    });

    await writeAuditLog({
      req,
      entityType: "Client",
      entityId: client.id,
      action: "client.create",
      metadata: { type: client.type }
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

clientsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.findFirst({
      where: { id, organizationId: req.organizationId },
      include: { cases: true }
    });

    if (!client) notFound("Client not found");
    res.json(client);
  } catch (error) {
    next(error);
  }
});

clientsRouter.patch("/:id", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = parseBody(clientUpdateSchema, req.body);
    const existing = await prisma.client.findFirst({
      where: { id, organizationId: req.organizationId }
    });

    if (!existing) notFound("Client not found");

    const client = await prisma.client.update({
      where: { id },
      data: input
    });

    await writeAuditLog({
      req,
      entityType: "Client",
      entityId: client.id,
      action: "client.update",
      metadata: { fields: Object.keys(input) }
    });

    res.json(client);
  } catch (error) {
    next(error);
  }
});

clientsRouter.delete("/:id", requireAtLeastRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const caseCount = await prisma.legalCase.count({
      where: { clientId: id, organizationId: req.organizationId }
    });

    if (caseCount > 0) {
      throw new HttpError(409, "Client has linked cases and cannot be deleted");
    }

    await prisma.client.delete({
      where: { id, organizationId: req.organizationId }
    });

    await writeAuditLog({
      req,
      entityType: "Client",
      entityId: id,
      action: "client.delete"
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
