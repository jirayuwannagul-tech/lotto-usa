import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

export async function saveUploadedFile(
  file: File,
  folder: "slips" | "tickets"
): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split(".").pop() ?? "jpg"
  return saveBuffer(buffer, ext, folder)
}

export async function saveBuffer(
  buffer: Buffer,
  ext: string,
  folder: "slips" | "tickets"
): Promise<string> {
  const filename = `${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder)
  await mkdir(uploadDir, { recursive: true })
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)
  return `/uploads/${folder}/${filename}`
}
