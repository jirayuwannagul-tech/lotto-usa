const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_ADMIN_CHAT_IDS",
  "TELEGRAM_WEBHOOK_SECRET",
] as const

const OPTIONAL_ENV = [
  "OPENAI_API_KEY",
  "EXCHANGE_RATE_API_KEY",
  "CRON_SECRET",
  "OMISE_SECRET_KEY",
  "OMISE_PUBLIC_KEY",
  "OMISE_WEBHOOK_SECRET",
] as const

export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const msg = `[env] Missing required environment variables: ${missing.join(", ")}`
    console.error(msg)
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg)
    }
  }

  const missingOptional = OPTIONAL_ENV.filter((key) => !process.env[key])
  if (missingOptional.length > 0) {
    console.warn(`[env] Optional env vars not set (features may be disabled): ${missingOptional.join(", ")}`)
  }
}
