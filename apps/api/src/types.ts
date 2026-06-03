import type { MemberRole, User } from "@prisma/client";

export type AuthUser = Pick<User, "id" | "email" | "fullName" | "avatarUrl" | "status">;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      organizationRole?: MemberRole;
    }
  }
}
