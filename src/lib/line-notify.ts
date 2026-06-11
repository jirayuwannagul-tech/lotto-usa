import { sendRealtimeMessage } from "@/lib/telegram"

export async function sendLineNotify(message: string): Promise<void> {
  await sendRealtimeMessage(message).catch(() => {})
}
