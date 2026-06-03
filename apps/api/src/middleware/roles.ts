import type { MemberRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http";

const roleRank: Record<MemberRole, number> = {
  viewer: 0,
  assistant: 1,
  lawyer: 2,
  admin: 3,
  owner: 4
};

export function requireRole(allowed: MemberRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.organizationRole || !allowed.includes(req.organizationRole)) {
      next(new HttpError(403, "Недостаточно прав для действия"));
      return;
    }

    next();
  };
}

export function requireAtLeastRole(role: MemberRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.organizationRole || roleRank[req.organizationRole] < roleRank[role]) {
      next(new HttpError(403, "Недостаточно прав для действия"));
      return;
    }

    next();
  };
}
