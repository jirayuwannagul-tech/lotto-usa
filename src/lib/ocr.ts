import OpenAI from "openai"

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export interface OcrResult {
  mainNumbers: string[]
  specialNumber: string
  raw: string
}

export async function readLotteryTicketFromBuffer(buffer: Buffer): Promise<OcrResult | null> {
  const base64 = buffer.toString("base64")
  const dataUrl = `data:image/jpeg;base64,${base64}`
  return readLotteryTicket(dataUrl)
}

export async function readLotteryTicket(imageUrl: string): Promise<OcrResult | null> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: `This is a US lottery ticket (Powerball or Mega Millions).
Extract the lottery numbers. Return ONLY valid JSON in this exact format:
{"mainNumbers": ["03","12","25","41","60"], "specialNumber": "13"}

Rules:
- mainNumbers: exactly 5 numbers, zero-padded to 2 digits, sorted ascending
- specialNumber: the Powerball or Mega Ball number, zero-padded to 2 digits
- If multiple plays on one ticket, return the FIRST play only
- Return ONLY the JSON, no other text`,
            },
          ],
        },
      ],
      max_tokens: 200,
    })

    const raw = response.choices[0].message.content ?? ""

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.mainNumbers || !parsed.specialNumber) return null

    return {
      mainNumbers: parsed.mainNumbers.map((n: string) => n.padStart(2, "0")),
      specialNumber: String(parsed.specialNumber).padStart(2, "0"),
      raw,
    }
  } catch {
    return null
  }
}

export function normalizeNumbers(main: string[], special: string): string {
  const sorted = [...main].map((n) => n.padStart(2, "0")).sort()
  return sorted.join(",") + "|" + special.padStart(2, "0")
}

export function numbersMatch(
  storedMain: string,
  storedSpecial: string,
  ocrMain: string[],
  ocrSpecial: string
): boolean {
  const stored = normalizeNumbers(storedMain.split(","), storedSpecial)
  const ocr = normalizeNumbers(ocrMain, ocrSpecial)
  return stored === ocr
}
