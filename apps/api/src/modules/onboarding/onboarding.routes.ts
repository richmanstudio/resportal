import { Router } from "express";
import { onboardingDemoDataSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { createDocxBuffer } from "../../lib/docx";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { saveBase64File } from "../../lib/storage";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";

export const onboardingRouter = Router();

onboardingRouter.use(requireAuth, requireOrganization);

onboardingRouter.get("/summary", async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    const [clients, cases, deadlines, tasks, documents, events, demoEvents] = await Promise.all([
      prisma.client.count({ where: { organizationId } }),
      prisma.legalCase.count({ where: { organizationId } }),
      prisma.deadline.count({ where: { organizationId } }),
      prisma.task.count({ where: { organizationId } }),
      prisma.caseDocument.count({ where: { organizationId } }),
      prisma.caseEvent.count({ where: { organizationId } }),
      prisma.auditLog.count({ where: { organizationId, action: "onboarding.demo_data.create" } })
    ]);

    res.json({
      clients,
      cases,
      deadlines,
      tasks,
      documents,
      events,
      demoDataCreated: demoEvents > 0,
      completed: {
        client: clients > 0,
        case: cases > 0,
        deadline: deadlines > 0,
        task: tasks > 0,
        document: documents > 0
      }
    });
  } catch (error) {
    next(error);
  }
});

onboardingRouter.post("/demo-data", requireAtLeastRole("lawyer"), async (req, res, next) => {
  try {
    const input = parseBody(onboardingDemoDataSchema, req.body ?? {});
    const organizationId = req.organizationId!;
    const demoEvents = await prisma.auditLog.count({ where: { organizationId, action: "onboarding.demo_data.create" } });
    if (demoEvents > 0) {
      throw new HttpError(409, "Демо-данные уже были добавлены. Дальше попробуйте создать клиента, дело, срок или документ самостоятельно.");
    }

    const existingCases = await prisma.legalCase.count({ where: { organizationId } });
    const now = new Date();
    const hearingAt = new Date(now);
    hearingAt.setDate(now.getDate() + 3);
    hearingAt.setHours(10, 30, 0, 0);
    const deadlineAt = new Date(now);
    deadlineAt.setDate(now.getDate() + 7);
    deadlineAt.setHours(18, 0, 0, 0);

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          organizationId,
          type: "legal_entity",
          fullName: `ООО "Демо Клиент ${existingCases + 1}"`,
          shortName: "Демо Клиент",
          inn: "7700000000",
          email: "client@example.test",
          phone: "+7 495 000-00-00",
          representativeName: "Иван Петров"
        }
      });

      const legalCase = await tx.legalCase.create({
        data: {
          organizationId,
          clientId: client.id,
          title: "Взыскание задолженности по договору поставки",
          caseNumber: `А40-DEMO-${String(existingCases + 1).padStart(3, "0")}/2026`,
          courtName: "Арбитражный суд города Москвы",
          judgeName: "Смирнова Е.А.",
          category: "Арбитражный спор",
          status: "active",
          side: "plaintiff",
          claimAmount: 1250000,
          responsibleUserId: req.user!.id,
          description: "Демонстрационное дело для знакомства с рабочим процессом РЕСПОРТАЛ."
        }
      });

      const deadline = await tx.deadline.create({
        data: {
          organizationId,
          caseId: legalCase.id,
          title: "Подать уточненный расчет задолженности",
          priority: "high",
          status: "active",
          deadlineAt,
          responsibleUserId: req.user!.id,
          basis: "Определение суда о подготовке дела"
        }
      });

      const task = await tx.task.create({
        data: {
          organizationId,
          caseId: legalCase.id,
          title: "Согласовать позицию с доверителем",
          priority: "urgent",
          status: "todo",
          dueAt: hearingAt,
          assignedToId: req.user!.id,
          createdById: req.user!.id
        }
      });

      const event = await tx.caseEvent.create({
        data: {
          organizationId,
          caseId: legalCase.id,
          type: "hearing",
          title: "Предварительное судебное заседание",
          startAt: hearingAt,
          location: "Зал 305",
          createdById: req.user!.id,
          responsibleUserId: req.user!.id
        }
      });

      return { client, legalCase, deadline, task, event };
    });

    let document = null;
    if (input.includeDocuments) {
      const buffer = createDocxBuffer([
        "Демо-документ",
        "",
        `Дело: ${result.legalCase.caseNumber}`,
        `Клиент: ${result.client.fullName}`,
        "Назначение: пример файла для проверки документооборота."
      ]);
      const saved = await saveBase64File(organizationId, "demo-position.docx", buffer.toString("base64"));
      document = await prisma.caseDocument.create({
        data: {
          organizationId,
          caseId: result.legalCase.id,
          clientId: result.client.id,
          uploadedById: req.user!.id,
          title: "Правовая позиция по делу",
          type: "motion",
          fileName: saved.fileName,
          originalFileName: "demo-position.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: saved.size,
          storageKey: saved.storageKey,
          status: "draft",
          description: "Демо-файл для первого знакомства с архивом документов"
        }
      });
    }

    await writeAuditLog({
      req,
      entityType: "Onboarding",
      action: "onboarding.demo_data.create",
      metadata: { caseId: result.legalCase.id, includeDocuments: input.includeDocuments }
    });

    res.status(201).json({ ...result, document });
  } catch (error) {
    next(error);
  }
});
