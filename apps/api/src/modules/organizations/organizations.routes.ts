import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { memberInviteSchema, memberUpdateSchema, organizationCreateSchema } from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { config } from "../../lib/config";
import { sendEmail } from "../../lib/email";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/organization";
import { requireRole } from "../../middleware/roles";
import { requireUserLimit } from "../../middleware/tariff-limits";

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

function createRawToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
    const rawToken = createRawToken();
    const organization = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!organization) throw new HttpError(404, "Organization not found");

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: req.organizationId!,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        tokenHash: hashToken(rawToken),
        invitedById: req.user!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const url = `${config.appPublicUrl}/invite?token=${encodeURIComponent(rawToken)}`;
    await sendEmail({
      to: input.email,
      subject: `Приглашение в ${organization.name} на РЕСПОРТАЛ`,
      text: `${req.user!.fullName} приглашает вас в рабочее пространство "${organization.name}".\n\nПринять приглашение: ${url}\n\nСсылка действует 7 дней.`
    });

    await writeAuditLog({
      req,
      entityType: "OrganizationInvite",
      entityId: invite.id,
      action: "organization.member.invite",
      metadata: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt.toISOString() }
    });

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      fullName: invite.fullName,
      role: invite.role,
      status: "invited",
      expiresAt: invite.expiresAt
    });
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
