import bcrypt from "bcryptjs";
import { Router, type CookieOptions } from "express";
import { createHash, randomBytes } from "node:crypto";
import {
  emailVerificationRequestSchema,
  emailVerificationSchema,
  inviteAcceptSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
  userProfileUpdateSchema
} from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { config } from "../../lib/config";
import { sendEmail } from "../../lib/email";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

export const authRouter = Router();

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.authCookieSecure,
  maxAge: 30 * 24 * 60 * 60 * 1000
};

function createRawToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenUrl(path: string, token: string) {
  return `${config.appPublicUrl}${path}?token=${encodeURIComponent(token)}`;
}

async function createAuthToken(userId: string, type: "password_reset" | "email_verification", ttlMinutes: number) {
  const rawToken = createRawToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000)
    }
  });
  return rawToken;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = parseBody(registerSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing) {
      throw new HttpError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          lastLoginAt: new Date()
        }
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          type: "solo",
          ownerId: user.id,
          tariffStatus: "cancelled",
          activeCasesLimit: 3,
          storageLimit: 512,
          usersLimit: 1,
          members: {
            create: {
              userId: user.id,
              role: "owner",
              status: "active",
              joinedAt: new Date()
            }
          }
        }
      });

      return { user, organization };
    });

    await writeAuditLog({
      req,
      organizationId: result.organization.id,
      userId: result.user.id,
      entityType: "User",
      entityId: result.user.id,
      action: "auth.register"
    });

    const accessToken = signAccessToken(result.user);
    const refreshToken = signRefreshToken(result.user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        avatarUrl: result.user.avatarUrl
      },
      organization: result.organization
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await writeAuditLog({
      req,
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "auth.login"
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken ?? req.body?.refreshToken;

    if (!token) {
      throw new HttpError(401, "Refresh token is required");
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.status !== "active") {
      throw new HttpError(401, "Invalid refresh token");
    }

    res.json({ accessToken: signAccessToken(user) });
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid refresh token"));
  }
});

authRouter.post("/password-reset/request", async (req, res, next) => {
  try {
    const input = parseBody(passwordResetRequestSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (user) {
      const token = await createAuthToken(user.id, "password_reset", 60);
      const url = tokenUrl("/password-reset", token);
      await sendEmail({
        to: user.email,
        subject: "Восстановление пароля в РЕСПОРТАЛЕ",
        text: `Для восстановления пароля откройте ссылку: ${url}\n\nСсылка действует 60 минут.`
      });
    }

    await writeAuditLog({
      req,
      userId: user?.id,
      entityType: "User",
      entityId: user?.id,
      action: "auth.password_reset.request"
    });

    res.json({
      status: "accepted",
      message: "Если email зарегистрирован, инструкции по восстановлению будут отправлены."
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password-reset/confirm", async (req, res, next) => {
  try {
    const input = parseBody(passwordResetSchema, req.body);
    const tokenHash = hashToken(input.token);
    const token = await prisma.authToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!token || token.type !== "password_reset" || token.usedAt || token.expiresAt < new Date()) {
      throw new HttpError(400, "Ссылка восстановления пароля недействительна или устарела.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await bcrypt.hash(input.password, 12) }
      }),
      prisma.authToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      })
    ]);

    await writeAuditLog({
      req,
      userId: token.userId,
      entityType: "User",
      entityId: token.userId,
      action: "auth.password_reset.confirm"
    });

    res.json({ status: "ok", message: "Пароль обновлен. Теперь можно войти с новым паролем." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/email-verification/request", async (req, res, next) => {
  try {
    const input = parseBody(emailVerificationRequestSchema, req.body ?? {});
    const user = input.email ? await prisma.user.findUnique({ where: { email: input.email } }) : null;

    if (user && !user.emailVerifiedAt) {
      const token = await createAuthToken(user.id, "email_verification", 24 * 60);
      const url = tokenUrl("/email-verification", token);
      await sendEmail({
        to: user.email,
        subject: "Подтверждение email в РЕСПОРТАЛЕ",
        text: `Подтвердите email по ссылке: ${url}\n\nСсылка действует 24 часа.`
      });
    }

    await writeAuditLog({
      req,
      userId: user?.id,
      entityType: "User",
      entityId: user?.id,
      action: "auth.email_verification.request"
    });

    res.json({
      status: "accepted",
      message: "Если email зарегистрирован, письмо для подтверждения будет отправлено."
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/email-verification/confirm", async (req, res, next) => {
  try {
    const input = parseBody(emailVerificationSchema, req.body);
    const tokenHash = hashToken(input.token);
    const token = await prisma.authToken.findUnique({
      where: { tokenHash }
    });

    if (!token || token.type !== "email_verification" || token.usedAt || token.expiresAt < new Date()) {
      throw new HttpError(400, "Ссылка подтверждения email недействительна или устарела.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() }
      }),
      prisma.authToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      })
    ]);

    await writeAuditLog({
      req,
      userId: token.userId,
      entityType: "User",
      entityId: token.userId,
      action: "auth.email_verification.confirm"
    });

    res.json({ status: "ok", message: "Email подтвержден." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/invites/accept", async (req, res, next) => {
  try {
    const input = parseBody(inviteAcceptSchema, req.body);
    const tokenHash = hashToken(input.token);
    const invite = await prisma.organizationInvite.findUnique({
      where: { tokenHash },
      include: { organization: true }
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new HttpError(400, "Приглашение недействительно или устарело.");
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (!existingUser && !input.password) {
      throw new HttpError(400, "Для первого входа по приглашению задайте пароль.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = existingUser ?? await tx.user.create({
        data: {
          email: invite.email,
          fullName: invite.fullName,
          passwordHash: await bcrypt.hash(input.password!, 12),
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date()
        }
      });

      const member = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId: user.id
          }
        },
        update: {
          role: invite.role,
          status: "active",
          joinedAt: new Date()
        },
        create: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role,
          status: "active",
          invitedAt: invite.createdAt,
          joinedAt: new Date()
        }
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      });

      return { user, member };
    });

    await writeAuditLog({
      req,
      organizationId: invite.organizationId,
      userId: result.user.id,
      entityType: "OrganizationMember",
      entityId: result.member.id,
      action: "organization.member.invite.accept",
      metadata: { role: result.member.role }
    });

    const accessToken = signAccessToken(result.user);
    const refreshToken = signRefreshToken(result.user);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    res.json({
      accessToken,
      refreshToken,
      organization: invite.organization,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        avatarUrl: result.user.avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("refreshToken");
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user?.id },
      include: { organization: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, fullName: true, avatarUrl: true, status: true }
    });

    res.json({ user, memberships });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const input = parseBody(userProfileUpdateSchema, req.body);
    const avatarUrl = input.avatarBase64
      ? `data:${input.avatarMimeType};base64,${input.avatarBase64}`
      : input.avatarUrl === ""
        ? null
        : input.avatarUrl;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        fullName: input.fullName,
        avatarUrl
      },
      select: { id: true, email: true, fullName: true, avatarUrl: true, status: true }
    });

    await writeAuditLog({
      req,
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "user.profile.update",
      metadata: { fields: Object.keys(input) }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});
