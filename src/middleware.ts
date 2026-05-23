import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(key)

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false

  entry.count++
  return true
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit login endpoints
  if (
    (pathname === "/api/auth/callback/credentials" || pathname === "/api/auth/signin") &&
    req.method === "POST"
  ) {
    const key = getRateLimitKey(req)
    if (!checkRateLimit(key)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 1 minute." },
        { status: 429 },
      )
    }
  }

  // Protect /admin routes (except /admin-login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== "ADMIN") {
      const loginUrl = new URL("/admin-login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect /api/admin routes
  if (pathname.startsWith("/api/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/auth/callback/credentials",
    "/api/auth/signin",
  ],
}
