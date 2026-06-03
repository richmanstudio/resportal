import { Router } from "express";
import { taskCreateSchema, taskListQuerySchema, taskUpdateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { requireActiveTariff } from "../../middleware/tariff-limits";

export const tasksRouter = Router();

tasksRouter.use(requireAuth, requireOrganization);

tasksRouter.get("/", async (req, res, next) => {
  try {
    const query = taskListQuerySchema.parse(req.query);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(endOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: req.organizationId,
        status: query.status,
        caseId: query.caseId,
        ...(query.due === "overdue" ? { dueAt: { lt: now }, status: { notIn: ["done", "cancelled"] } } : {}),
        ...(query.due === "today" ? { dueAt: { gte: startOfToday, lte: endOfToday } } : {}),
        ...(query.due === "week" ? { dueAt: { gte: startOfToday, lte: endOfWeek } } : {})
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } }, assignedTo: { select: { id: true, fullName: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }]
    });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/", requireActiveTariff, requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(taskCreateSchema, req.body);
    if (input.caseId) {
      const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
      if (!legalCase) notFound("Case not found");
    }
    if (input.assignedToId) {
      const member = await prisma.organizationMember.findFirst({ where: { userId: input.assignedToId, organizationId: req.organizationId, status: "active" } });
      if (!member) notFound("Assigned user not found");
    }

    const task = await prisma.task.create({
      data: { ...input, organizationId: req.organizationId!, createdById: req.user!.id }
    });
    await writeAuditLog({
      req,
      entityType: "Task",
      entityId: task.id,
      action: "task.create",
      metadata: { caseId: task.caseId, priority: task.priority }
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

tasksRouter.patch("/:id", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = parseBody(taskUpdateSchema, req.body);
    const existing = await prisma.task.findFirst({ where: { id, organizationId: req.organizationId } });
    if (!existing) notFound("Task not found");
    if (input.caseId) {
      const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
      if (!legalCase) notFound("Case not found");
    }
    if (input.assignedToId) {
      const member = await prisma.organizationMember.findFirst({ where: { userId: input.assignedToId, organizationId: req.organizationId, status: "active" } });
      if (!member) notFound("Assigned user not found");
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...input,
        completedAt: input.status === undefined ? undefined : input.status === "done" ? new Date() : null
      }
    });
    await writeAuditLog({
      req,
      entityType: "Task",
      entityId: task.id,
      action: "task.update",
      metadata: { fields: Object.keys(input) }
    });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

tasksRouter.patch("/:id/complete", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.task.findFirst({ where: { id, organizationId: req.organizationId } });
    if (!existing) notFound("Task not found");
    const task = await prisma.task.update({
      where: { id },
      data: { status: "done", completedAt: new Date() }
    });
    await writeAuditLog({
      req,
      entityType: "Task",
      entityId: task.id,
      action: "task.complete"
    });
    res.json(task);
  } catch (error) {
    next(error);
  }
});
