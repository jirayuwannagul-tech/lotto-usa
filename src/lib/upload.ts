import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads")
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export interface StoredUpload {
  assetPath: string
  buffer: Buffer
  contentType: string
}

export async function saveUploadedFile(
  file: File,
  folder: "slips" | "tickets"
): Promise<StoredUpload> {
  const contentType = file.type.toLowerCase()
  const ext = ALLOWED_IMAGE_TYPES.get(contentType)
  if (!ext) {
    throw new Error("รองรับเฉพาะไฟล์ภาพ JPEG, PNG หรือ WEBP")
  }

  const bytes = await file.arrayBuffer()
  if (bytes.byteLength === 0) {
    throw new Error("ไฟล์ว่างเปล่า")
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("ไฟล์มีขนาดใหญ่เกิน 10MB")
  }

  const buffer = Buffer.from(bytes)
  const assetPath = await saveBuffer(buffer, ext, folder)
  return { assetPath, buffer, contentType }
}

export async function saveBuffer(
  buffer: Buffer,
  ext: string,
  folder: "slips" | "tickets"
): Promise<string> {
  const filename = `${randomUUID()}.${ext}`
  const uploadDir = path.join(UPLOAD_ROOT, folder)
  await mkdir(uploadDir, { recursive: true })
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)
  return `${folder}/${filename}`
}

export function getUploadFilePath(assetPath: string): string {
  const normalized = assetPath.replace(/^\/+/, "")
  if (normalized.startsWith("uploads/")) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), "public", normalized)
  }

  const resolved = path.resolve(UPLOAD_ROOT, normalized)
  const allowedRoot = path.resolve(UPLOAD_ROOT)

  if (!resolved.startsWith(`${allowedRoot}${path.sep}`) && resolved !== allowedRoot) {
    throw new Error("Invalid upload path")
  }

  return resolved
}

export function getUploadContentType(assetPath: string): string {
  const ext = path.extname(assetPath).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}
