import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Register</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="mt-10 grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">ชื่อ</label>
            <input
              type="text"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="ชื่อผู้ใช้งาน"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</label>
            <input
              type="email"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  )
}
