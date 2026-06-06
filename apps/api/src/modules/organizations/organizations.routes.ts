import { Router } from "express";
import { memberInviteSchema, memberUpdateSchema, organizationCreateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireRole } from "../../middleware/roles";
import { requireUserLimit } from "../../middleware/tariff-limits";

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

organizationsRouter.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user?.id, status: "active" },
      include: { organization: true },
      orderBy: { createdAt: "asc" }
    });

    res.json(memberships);
  } catch (error) {
    next(error);
  }
});

organizationsRouter.post("/", async (req, res, next) => {
  try {
    const input = parseBody(organizationCreateSchema, req.body);

    const organization = await prisma.organization.create({
      data: {
        ...input,
        ownerId: req.user!.id,
        tariffPlan: input.type === "firm" ? "team" : "solo",
        tariffStatus: "cancelled",
        usersLimit: 1,
        activeCasesLimit: 3,
        storageLimit: 512,
        members: {
          create: {
            userId: req.user!.id,
            role: "owner",
            status: "active",
            joinedAt: new Date()
          }
        }
      }
    });

    await writeAuditLog({
      req,
      organizationId: organization.id,
      entityType: "Organization",
      entityId: organization.id,
      action: "organization.create",
      metadata: { type: organization.type }
    });

    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
});

organizationsRouter.get("/:organizationId/members", requireOrganization, async (req, res, next) => {
  try {
    if (req.params.organizationId !== req.organizationId) {
      throw new HttpError(400, "Route organization does not match x-organization-id");
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.organizationId },
      include: { user: { select: { id: true, email: true, fullName: true, status: true } } },
      orderBy: { createdAt: "asc" }
    });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

organizationsRouter.post("/:organizationId/invite", requireOrganization, requireRole(["owner", "admin"]), requireUserLimit, async (req, res, next) => {
  try {
    if (req.params.organizationId !== req.organizationId) {
      throw new HttpError(400, "Route organization does not match x-organization-id");
    }

    const input = parseBody(memberInviteSchema, req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, fullName: true, status: true }
    });

    if (!user) {
      throw new HttpError(404, "Пользователь с такой почтой не зарегистрирован. Сначала он должен создать аккаунт в РЕСПОРТАЛЕ.");
    }

    if (user.status !== "active") {
      throw new HttpError(409, "Этот пользователь заблокирован и не может быть добавлен в организацию.");
    }

    if (normalizePersonName(user.fullName) !== normalizePersonName(input.fullName)) {
      throw new HttpError(409, "ФИО не совпадает с зарегистрированным аккаунтом. Проверьте написание ФИО в профиле пользователя.");
    }

    const existingMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: req.organizationId!, userId: user.id } }
    });

    if (existingMember) {
      throw new HttpError(409, "Этот пользователь уже состоит в организации.");
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: req.organizationId!,
        userId: user.id,
        role: input.role,
        status: "active",
        invitedAt: new Date(),
        joinedAt: new Date()
      },
      include: { user: { select: { id: true, email: true, fullName: true, status: true } } }
    });

    await writeAuditLog({
      req,
      entityType: "OrganizationMember",
      entityId: member.id,
      action: "organization.member.invite",
      metadata: { email: user.email, role: member.role, addedUserId: user.id }
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

organizationsRouter.patch("/:organizationId/members/:memberId", requireOrganization, requireRole(["owner", "admin"]), async (req, res, next) => {
  try {
    if (req.params.organizationId !== req.organizationId) {
      throw new HttpError(400, "Route organization does not match x-organization-id");
    }

    const input = parseBody(memberUpdateSchema, req.body);
    const memberId = req.params.memberId as string;
    const existing = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: req.organizationId }
    });

    if (!existing) throw new HttpError(404, "Member not found");
    if (existing.role === "owner") {
      throw new HttpError(409, "Нельзя изменить роль владельца организации.");
    }

    const member = await prisma.organizationMember.update({
      where: { id: existing.id },
      data: { role: input.role, status: input.status },
      include: { user: { select: { id: true, email: true, fullName: true, status: true } } }
    });

    await writeAuditLog({
      req,
      entityType: "OrganizationMember",
      entityId: member.id,
      action: "organization.member.update",
      metadata: { role: member.role, status: member.status }
    });

    res.json(member);
  } catch (error) {
    next(error);
  }
});

organizationsRouter.delete("/:organizationId/members/:memberId", requireOrganization, requireRole(["owner", "admin"]), async (req, res, next) => {
  try {
    if (req.params.organizationId !== req.organizationId) {
      throw new HttpError(400, "Route organization does not match x-organization-id");
    }

    const memberId = req.params.memberId as string;
    const existing = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: req.organizationId }
    });

    if (!existing) throw new HttpError(404, "Member not found");
    if (existing.role === "owner") {
      throw new HttpError(409, "Нельзя удалить владельца организации.");
    }

    await prisma.organizationMember.delete({ where: { id: existing.id } });
    await writeAuditLog({
      req,
      entityType: "OrganizationMember",
      entityId: existing.id,
      action: "organization.member.delete",
      metadata: { removedUserId: existing.userId, role: existing.role }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
