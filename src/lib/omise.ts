import crypto from "crypto"

const OMISE_SECRET = process.env.OMISE_SECRET_KEY ?? ""
const OMISE_API = "https://api.omise.co"

async function omiseFetch(path: string, options: RequestInit = {}) {
  const credentials = Buffer.from(`${OMISE_SECRET}:`).toString("base64")
  const res = await fetch(`${OMISE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.headers as Record<string, string>),
    },
  })
  return res.json()
}

export async function createPromptPayCharge(params: {
  amount: number
  orderId: string
  description: string
}) {
  const body = new URLSearchParams()
  body.append("amount", String(params.amount))
  body.append("currency", "thb")
  body.append("source[type]", "promptpay")
  body.append("description", params.description)
  body.append("metadata[orderId]", params.orderId)
  body.append(
    "return_uri",
    `${process.env.NEXTAUTH_URL}/payment/callback?orderId=${params.orderId}`,
  )

  return omiseFetch("/charges", { method: "POST", body: body.toString() })
}

export async function getCharge(chargeId: string) {
  return omiseFetch(`/charges/${chargeId}`)
}

export function verifyOmiseWebhook(body: string, signature: string): boolean {
  const secret = process.env.OMISE_WEBHOOK_SECRET ?? ""
  if (!secret) return true
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  return expected === signature
}
