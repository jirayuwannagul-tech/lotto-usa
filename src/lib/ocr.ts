import OpenAI from "openai"

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export interface OcrResult {
  plays: {
    mainNumbers: string[]
    specialNumber: string
  }[]
  raw: string
}

export async function readLotteryTicketFromBuffer(
  buffer: Buffer,
  contentType = "image/jpeg"
): Promise<OcrResult | null> {
  const base64 = buffer.toString("base64")
  const dataUrl = `data:${contentType};base64,${base64}`
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
Extract ALL lottery plays visible in the image. Return ONLY valid JSON in this exact format:
{"plays":[{"mainNumbers":["03","12","25","41","60"],"specialNumber":"13"}]}

Rules:
- mainNumbers: exactly 5 numbers, zero-padded to 2 digits, sorted ascending
- specialNumber: the Powerball or Mega Ball number, zero-padded to 2 digits
- Return every visible play in order from top to bottom
- Do not return duplicates
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
    const plays = Array.isArray(parsed.plays)
      ? parsed.plays
      : parsed.mainNumbers && parsed.specialNumber
        ? [{ mainNumbers: parsed.mainNumbers, specialNumber: parsed.specialNumber }]
        : null

    if (!plays || plays.length === 0) return null

    return {
      plays: plays.map((play: { mainNumbers: string[]; specialNumber: string }) => ({
        mainNumbers: play.mainNumbers.map((n: string) => n.padStart(2, "0")).sort(),
        specialNumber: String(play.specialNumber).padStart(2, "0"),
      })),
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
