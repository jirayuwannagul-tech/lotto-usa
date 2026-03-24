const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT:  { label: "รอชำระเงิน",       color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  PENDING_APPROVAL: { label: "รอตรวจสลิป",        color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  APPROVED:         { label: "ชำระแล้ว / รอซื้อ", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  TICKET_UPLOADED:  { label: "กำลังจับคู่ตั๋ว",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  MATCHED:          { label: "ซื้อแล้ว ✓",         color: "bg-green-500/20 text-green-400 border-green-500/30" },
  REJECTED:         { label: "ถูกปฏิเสธ",          color: "bg-red-500/20 text-red-400 border-red-500/30" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-500/20 text-gray-400" }
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
