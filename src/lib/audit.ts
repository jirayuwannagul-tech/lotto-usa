import { prisma } from "@/lib/prisma"

type AuditAction =
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ORDER_DELETED"
  | "MEMBER_DELETED"
  | "MEMBER_MADE_REFERRER"
  | "DRAW_CREATED"
  | "RESULT_POSTED"
  | "COMMISSION_PAID"
  | "ORDERS_RESET"

export async function writeAuditLog(params: {
  adminId: string
  action: AuditAction
  targetId?: string
  targetType?: string
  note?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetId: params.targetId,
        targetType: params.targetType,
        note: params.note,
      },
    })
  } catch {
    // audit failure must never break the main flow
    console.error("[audit] failed to write log", params)
  }
}
