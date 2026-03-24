import type { Metadata } from "next"
import { Prompt } from "next/font/google"
import "./globals.css"
import SessionProviderWrapper from "@/components/shared/SessionProviderWrapper"
import { Toaster } from "@/components/ui/sonner"

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "LottoUSA — ซื้อ Powerball & Mega Millions จากไทย",
  description: "บริการซื้อหวยอเมริกัน Powerball และ Mega Millions สำหรับคนไทย",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="min-h-screen bg-slate-900 antialiased" style={{ fontFamily: "var(--font-prompt), sans-serif" }}>
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
