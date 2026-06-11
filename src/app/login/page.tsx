import Link from "next/link"
import Image from "next/image"
import LoginForm from "@/components/shared/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Image src="/lotto-usa-logo.png" alt="LottoUSA" width={1240} height={404} className="h-auto w-32" unoptimized />
          </Link>
          <Link href="/" className="text-sm text-white/40 transition hover:text-white">
            ← กลับหน้าแรก
          </Link>
        </div>

        <div className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
          <h1 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-white/40">ยินดีต้อนรับกลับมา</p>
          <div className="mt-8">
            <LoginForm redirectTo="/" theme="dark" />
          </div>
          <p className="mt-6 text-center text-sm text-white/40">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-semibold text-[#c9a84c] hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
