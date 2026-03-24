import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SessionProviderWrapper from "@/components/shared/SessionProviderWrapper"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LottoUSA — ซื้อ Powerball & Mega Millions จากไทย",
  description: "บริการซื้อหวยอเมริกัน Powerball และ Mega Millions สำหรับคนไทย",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-900 antialiased">
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
