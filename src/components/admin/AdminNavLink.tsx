"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className={`inline-flex rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-slate-600 bg-slate-800 text-white"
          : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}
