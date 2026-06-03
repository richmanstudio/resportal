import { Router } from "express";
import { documentListQuerySchema, documentUpdateSchema, documentUploadSchema, templateGenerateSchema } from "@resportal/shared";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { writeAuditLog } from "../../lib/audit";
import { createDocxBuffer } from "../../lib/docx";
import { notFound, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { resolveStorageKey, saveBase64File } from "../../lib/storage";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireAtLeastRole } from "../../middleware/roles";
import { assertStorageCapacity, requireActiveTariff } from "../../middleware/tariff-limits";

export const documentsRouter = Router();

documentsRouter.use(requireAuth, requireOrganization);

documentsRouter.get("/", async (req, res, next) => {
  try {
    const query = documentListQuerySchema.parse(req.query);
    const search = query.search?.trim();
    const documents = await prisma.caseDocument.findMany({
      where: {
        organizationId: req.organizationId,
        type: query.type,
        status: query.status,
        caseId: query.caseId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { originalFileName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { case: { title: { contains: search, mode: "insensitive" } } },
                { case: { caseNumber: { contains: search, mode: "insensitive" } } },
                { client: { fullName: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        client: { select: { id: true, fullName: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/upload", requireActiveTariff, requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(documentUploadSchema, req.body);
    if (input.caseId) {
      const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
      if (!legalCase) notFound("Case not found");
    }
    if (input.clientId) {
      const client = await prisma.client.findFirst({ where: { id: input.clientId, organizationId: req.organizationId } });
      if (!client) notFound("Client not found");
    }

    const uploadBytes = Buffer.byteLength(input.contentBase64, "base64");
    await assertStorageCapacity(req.organizationId!, uploadBytes);
    const saved = await saveBase64File(req.organizationId!, input.originalFileName, input.contentBase64);
    const document = await prisma.caseDocument.create({
      data: {
        organizationId: req.organizationId!,
        caseId: input.caseId,
        clientId: input.clientId,
        uploadedById: req.user!.id,
        title: input.title,
        type: input.type,
        fileName: saved.fileName,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        size: saved.size,
        storageKey: saved.storageKey,
        status: "ready",
        description: input.description
      }
    });

    await writeAuditLog({
      req,
      entityType: "CaseDocument",
      entityId: document.id,
      action: "document.upload",
      metadata: { caseId: document.caseId, clientId: document.clientId, size: document.size, mimeType: document.mimeType }
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

documentsRouter.patch("/:id", requireAtLeastRole("assistant"), async (req, res, next) => {
  try {
    const input = parseBody(documentUpdateSchema, req.body);
    const id = req.params.id as string;
    const document = await prisma.caseDocument.findFirst({
      where: { id, organizationId: req.organizationId }
    });
    if (!document) notFound("Document not found");

    if (input.caseId) {
      const legalCase = await prisma.legalCase.findFirst({ where: { id: input.caseId, organizationId: req.organizationId } });
      if (!legalCase) notFound("Case not found");
    }

    const updated = await prisma.caseDocument.update({
      where: { id: document.id },
      data: input,
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        client: { select: { id: true, fullName: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } }
      }
    });

    await writeAuditLog({
      req,
      entityType: "CaseDocument",
      entityId: updated.id,
      action: "document.update",
      metadata: { fields: Object.keys(input), status: updated.status }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const document = await prisma.caseDocument.findFirst({ where: { id: req.params.id, organizationId: req.organizationId } });
    if (!document) notFound("Document not found");
    await writeAuditLog({
      req,
      entityType: "CaseDocument",
      entityId: document.id,
      action: "document.download",
      metadata: { caseId: document.caseId, clientId: document.clientId, size: document.size }
    });
    res.download(resolveStorageKey(document.storageKey), document.originalFileName);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/generate", requireActiveTariff, requireAtLeastRole("lawyer"), async (req, res, next) => {
  try {
    const input = parseBody(templateGenerateSchema, req.body);
    const inputData = input.inputData ?? {};
    const legalCase = await prisma.legalCase.findFirst({
      where: { id: input.caseId, organizationId: req.organizationId },
      include: { client: true, parties: true }
    });
    if (!legalCase) notFound("Case not found");

    const templateTitle = {
      postpone_hearing: "Ходатайство об отложении судебного заседания",
      attach_documents: "Ходатайство о приобщении документов",
      case_review: "Заявление об ознакомлении с материалами дела",
      claim_response: "Отзыв на исковое заявление",
      pretrial_claim: "Претензия"
    }[input.templateType];

    const lines = [
      templateTitle,
      "",
      `Дело: ${legalCase.caseNumber ?? legalCase.title}`,
      `Суд: ${legalCase.courtName ?? "не указан"}`,
      `Клиент: ${legalCase.client.fullName}`,
      `Дата: ${new Date().toLocaleDateString("ru-RU")}`,
      "",
      inputData.recipient ? `Адресат: ${inputData.recipient}` : "",
      inputData.body ?? "Прошу суд рассмотреть настоящее заявление и приобщить его к материалам дела.",
      "",
      "Приложения:",
      inputData.attachments ?? "1. Документы по тексту заявления.",
      "",
      "Подпись: __________________"
    ].filter((line) => line !== undefined);

    const buffer = createDocxBuffer(lines);
    await assertStorageCapacity(req.organizationId!, buffer.byteLength);
    const fileName = `${randomUUID()}-${input.title.replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_")}.docx`;
    const saved = await saveBase64File(req.organizationId!, fileName, buffer.toString("base64"));

    const template = await prisma.documentTemplate.upsert({
      where: { id: input.templateType },
      update: {},
      create: {
        id: input.templateType,
        scope: "system",
        title: templateTitle,
        type: input.templateType,
        templateFileKey: "system",
        fieldsSchema: {}
      }
    });

    const generated = await prisma.generatedDocument.create({
      data: {
        organizationId: req.organizationId!,
        caseId: input.caseId,
        templateId: template.id,
        generatedById: req.user!.id,
        title: input.title,
        inputDataJson: inputData,
        outputFileKey: saved.storageKey
      }
    });

    const document = await prisma.caseDocument.create({
      data: {
        organizationId: req.organizationId!,
        caseId: input.caseId,
        uploadedById: req.user!.id,
        title: input.title,
        type: "motion",
        fileName: saved.fileName,
        originalFileName: fileName,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: buffer.byteLength,
        storageKey: saved.storageKey,
        status: "ready",
        description: `Generated document ${generated.id}`
      }
    });

    await writeAuditLog({
      req,
      entityType: "GeneratedDocument",
      entityId: generated.id,
      action: "document.generate",
      metadata: { caseId: input.caseId, templateType: input.templateType, documentId: document.id }
    });

    res.status(201).json({ generated, document });
  } catch (error) {
    next(error);
  }
});
