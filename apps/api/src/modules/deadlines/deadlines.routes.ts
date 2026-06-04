import { Router } from "express";
import { deadlineCreateSchema, deadlineListQuerySchema, deadlineReminderSendSchema, deadlineUpdateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { sendEmail } from "../../lib/email";
import { notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { requireActiveTariff } from "../../middleware/tariff-limits";

export const deadlinesRouter = Router();

deadlinesRouter.use(requireAuth, requireOrganization);

deadlinesRouter.get("/", async (req, res, next) => {
  try {
    const query = deadlineListQuerySchema.parse(req.query);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(endOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    await prisma.deadline.updateMany({
      where: { organizationId: req.organizationId, status: "active", deadlineAt: { lt: now } },
      data: { status: "overdue" }
    });

    const deadlines = await prisma.deadline.findMany({
      where: {
        organizationId: req.organizationId,
        status: query.status,
        caseId: query.caseId,
        ...(query.due === "overdue" ? { deadlineAt: { lt: now }, status: { in: ["active", "overdue"] } } : {}),
        ...(query.due === "today" ? { deadlineAt: { gte: startOfToday, lte: endOfToday } } : {}),
        ...(query.due === "week" ? { deadlineAt: { gte: startOfToday, lte: endOfWeek } } : {})
      },
      include: { case: { select: { id: true, title: true, caseNumber: true } }, responsibleUser: { select: { id: true, fullName: true } } },
      orderBy: { deadlineAt: "asc" }
    });
    res.json(deadlines);
  } catch (error) {
    next(error);
  }
});

deadlinesRouter.post("/", requireActiveTariff, requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(deadlineCreateSchema, req.body);
    const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
    if (!legalCase) notFound("Case not found");
    if (input.responsibleUserId) {
      const member = await prisma.organizationMember.findFirst({ where: { userId: input.responsibleUserId, organizationId: req.organizationId, status: "active" } });
      if (!member) notFound("Responsible user not found");
    }

    const deadline = await prisma.deadline.create({
      data: { ...input, organizationId: req.organizationId! }
    });
    await writeAuditLog({
      req,
      entityType: "Deadline",
      entityId: deadline.id,
      action: "deadline.create",
      metadata: { caseId: deadline.caseId, priority: deadline.priority }
    });
    res.status(201).json(deadline);
  } catch (error) {
    next(error);
  }
});

deadlinesRouter.post("/reminders/send", requireAtLeastRole("admin"), async (req, res, next) => {
  try {
    const input = parseBody(deadlineReminderSendSchema, req.body ?? {});
    const now = new Date();
    const daysBefore = input.daysBefore ?? [0, 1, 3, 7];
    const targets = daysBefore.map((days) => {
      const start = new Date(now);
      start.setDate(start.getDate() + days);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { days, start, end };
    });

    const deadlines = await prisma.deadline.findMany({
      where: {
        organizationId: req.organizationId,
        status: { in: ["active", "overdue"] },
        OR: targets.map((target) => ({ deadlineAt: { gte: target.start, lte: target.end } }))
      },
      include: {
        case: { select: { title: true, caseNumber: true } },
        responsibleUser: { select: { email: true, fullName: true } },
        organization: { select: { owner: { select: { email: true, fullName: true } } } }
      },
      orderBy: { deadlineAt: "asc" }
    });

    await Promise.all(deadlines.map((deadline) => {
      const recipient = deadline.responsibleUser ?? deadline.organization.owner;
      const caseTitle = deadline.case.caseNumber ?? deadline.case.title;
      return sendEmail({
        to: recipient.email,
        subject: `Напоминание о сроке: ${deadline.title}`,
        text: `Срок: ${deadline.title}\nДело: ${caseTitle}\nДата: ${deadline.deadlineAt.toLocaleDateString("ru-RU")}\n\nПроверьте карточку дела в РЕСПОРТАЛЕ.`
      });
    }));

    await writeAuditLog({
      req,
      entityType: "Deadline",
      action: "deadline.reminders.send",
      metadata: { sent: deadlines.length, daysBefore }
    });

    res.json({ sent: deadlines.length });
  } catch (error) {
    next(error);
  }
});

deadlinesRouter.patch("/:id", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = parseBody(deadlineUpdateSchema, req.body);
    const existing = await prisma.deadline.findFirst({ where: { id, organizationId: req.organizationId } });
    if (!existing) notFound("Deadline not found");
    if (input.caseId) {
      const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
      if (!legalCase) notFound("Case not found");
    }
    if (input.responsibleUserId) {
      const member = await prisma.organizationMember.findFirst({ where: { userId: input.responsibleUserId, organizationId: req.organizationId, status: "active" } });
      if (!member) notFound("Responsible user not found");
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        ...input,
        completedAt: input.status === undefined ? undefined : input.status === "completed" ? new Date() : null
      }
    });
    await writeAuditLog({
      req,
      entityType: "Deadline",
      entityId: deadline.id,
      action: "deadline.update",
      metadata: { fields: Object.keys(input) }
    });
    res.json(deadline);
  } catch (error) {
    next(error);
  }
});

deadlinesRouter.patch("/:id/complete", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.deadline.findFirst({ where: { id, organizationId: req.organizationId } });
    if (!existing) notFound("Deadline not found");
    const deadline = await prisma.deadline.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() }
    });
    await writeAuditLog({
      req,
      entityType: "Deadline",
      entityId: deadline.id,
      action: "deadline.complete"
    });
    res.json(deadline);
  } catch (error) {
    next(error);
  }
});
