import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

type AccessTokenPayload = {
  sub: string;
  email: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      throw new HttpError(401, "Authentication is required");
    }

    const payload = jwt.verify(token, config.accessSecret) as AccessTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, avatarUrl: true, status: true }
    });

    if (!user || user.status !== "active") {
      throw new HttpError(401, "User is not active");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid access token"));
  }
}
