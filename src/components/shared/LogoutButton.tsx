"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LogoutButtonProps {
  redirectTo?: string
  className?: string
}

export default function LogoutButton({ redirectTo = "/", className }: LogoutButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut({ redirect: false })
        window.location.href = redirectTo
      }}
      className={cn("text-white/50 hover:text-white text-xs", className)}
    >
      ออกจากระบบ
    </Button>
  )
}
