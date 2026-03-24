const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "รอชำระเงิน", color: "border-amber-200 bg-amber-50 text-amber-700" },
  PENDING_APPROVAL: { label: "รอตรวจสลิป", color: "border-orange-200 bg-orange-50 text-orange-700" },
  APPROVED: { label: "ชำระแล้ว / รอซื้อ", color: "border-sky-200 bg-sky-50 text-sky-700" },
  TICKET_UPLOADED: { label: "กำลังจับคู่ตั๋ว", color: "border-violet-200 bg-violet-50 text-violet-700" },
  MATCHED: { label: "ซื้อแล้ว", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "ถูกปฏิเสธ", color: "border-rose-200 bg-rose-50 text-rose-700" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: "border-slate-200 bg-slate-100 text-slate-700",
  }
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
