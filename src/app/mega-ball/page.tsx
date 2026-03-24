import Link from "next/link"

export default function MegaBallPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Mega Ball</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-semibold text-slate-500">หน้าซื้อหวย</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Mega Ball</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            หน้านี้สำหรับซื้อหวย Mega Ball โดยเฉพาะ รอบนี้ผมเพิ่ม route ให้ปุ่มจากหน้าแรกเข้ามาถึงได้ก่อน
          </p>
        </div>
      </div>
    </div>
  )
}
