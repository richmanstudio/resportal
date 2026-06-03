import { Router } from "express";
import { globalSearchQuerySchema } from "@resportal/shared";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";

export const searchRouter = Router();

searchRouter.use(requireAuth, requireOrganization);

searchRouter.get("/", async (req, res, next) => {
  try {
    const query = globalSearchQuerySchema.parse(req.query);
    const search = query.q.trim();

    const [cases, clients, documents] = await Promise.all([
      prisma.legalCase.findMany({
        where: {
          organizationId: req.organizationId,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { caseNumber: { contains: search, mode: "insensitive" } },
            { courtName: { contains: search, mode: "insensitive" } },
            { client: { fullName: { contains: search, mode: "insensitive" } } }
          ]
        },
        select: { id: true, title: true, caseNumber: true, status: true, updatedAt: true },
        take: 8,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.client.findMany({
        where: {
          organizationId: req.organizationId,
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { inn: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        },
        select: { id: true, fullName: true, type: true, email: true, phone: true },
        take: 8,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.caseDocument.findMany({
        where: {
          organizationId: req.organizationId,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { originalFileName: { contains: search, mode: "insensitive" } },
            { case: { title: { contains: search, mode: "insensitive" } } },
            { case: { caseNumber: { contains: search, mode: "insensitive" } } }
          ]
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          originalFileName: true,
          createdAt: true,
          case: { select: { id: true, title: true, caseNumber: true } }
        },
        take: 8,
        orderBy: { createdAt: "desc" }
      })
    ]);

    res.json({ query: search, cases, clients, documents });
  } catch (error) {
    next(error);
  }
});
