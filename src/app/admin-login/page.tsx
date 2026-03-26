import LoginForm from "@/components/shared/LoginForm"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-sky-400">ADMIN ONLY</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Admin Login</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-slate-400">
          หน้านี้สำหรับผู้ดูแลระบบเท่านั้น ใช้บัญชีแอดมินเพื่อเข้าสู่หลังบ้านแยกจากฝั่งลูกค้า
        </p>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <LoginForm portal="admin" redirectTo="/admin" showRegisterLink={false} theme="dark" />
        </div>
      </div>
    </div>
  )
}
