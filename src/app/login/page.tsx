import Link from "next/link"
import LoginForm from "@/components/shared/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Login</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="mt-10">
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            ยินดีต้อนรับ กรุณาเข้าสู่ระบบเพื่อซื้อหวยและติดตามสถานะออเดอร์ของคุณ
          </div>
          <LoginForm redirectTo="/" />
        </div>
      </div>
    </div>
  )
}
