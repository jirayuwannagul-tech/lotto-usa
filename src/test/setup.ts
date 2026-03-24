import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}))

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    draw: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
    },
    exchangeRate: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({
      order: { create: vi.fn() },
    })),
  },
}))

// Mock telegram
vi.mock("@/lib/telegram", () => ({
  sendMessage: vi.fn(),
  sendAdminMessage: vi.fn(),
  isAllowedChat: vi.fn(() => true),
  downloadFileBuffer: vi.fn(),
}))

// Mock exchange rate
vi.mock("@/lib/exchange-rate", () => ({
  getExchangeRate: vi.fn(() => Promise.resolve(35)),
}))

// Mock upload
vi.mock("@/lib/upload", () => ({
  saveUploadedFile: vi.fn(() => Promise.resolve("/uploads/test.jpg")),
  saveBuffer: vi.fn(() => Promise.resolve("/uploads/test.jpg")),
}))
