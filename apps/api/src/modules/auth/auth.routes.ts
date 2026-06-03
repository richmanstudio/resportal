import bcrypt from "bcryptjs";
import { Router } from "express";
import {
  emailVerificationRequestSchema,
  emailVerificationSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
  userProfileUpdateSchema
} from "@resportal/shared";
import { writeAuditLog } from "../../lib/audit";
import { HttpError, parseBody } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

export const authRouter = Router();

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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

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
    parseBody(passwordResetSchema, req.body);
    res.status(501).json({
      message: "Восстановление пароля ожидает подключения почтового провайдера и таблицы reset-токенов."
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/email-verification/request", async (req, res, next) => {
  try {
    const input = parseBody(emailVerificationRequestSchema, req.body ?? {});
    const user = input.email ? await prisma.user.findUnique({ where: { email: input.email } }) : null;

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
    parseBody(emailVerificationSchema, req.body);
    res.status(501).json({
      message: "Подтверждение email ожидает подключения почтового провайдера и таблицы verification-токенов."
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
