"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut({ redirect: false })
        window.location.href = "/"
      }}
      className="text-white/50 hover:text-white text-xs"
    >
      ออกจากระบบ
    </Button>
  )
}
