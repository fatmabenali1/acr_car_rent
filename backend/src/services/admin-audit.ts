import type { Prisma } from "@prisma/client";
import { prisma } from "../db";

export async function logAdminAction(input: {
  adminUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue;
  database?: Pick<Prisma.TransactionClient, "adminAuditLog">;
}): Promise<void> {
  await (input.database ?? prisma).adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      details: input.details,
    },
  });
}
