import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

export async function requireOrganization(req: Request, _res: Response, next: NextFunction) {
  try {
    const organizationId = req.header("x-organization-id");

    if (!req.user) {
      throw new HttpError(401, "Authentication is required");
    }

    if (!organizationId) {
      throw new HttpError(400, "x-organization-id header is required");
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id
        }
      }
    });

    if (!membership || membership.status !== "active") {
      throw new HttpError(403, "Organization access denied");
    }

    req.organizationId = organizationId;
    req.organizationRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}
