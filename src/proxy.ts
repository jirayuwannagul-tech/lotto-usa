import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const loginUrl = new URL("/login", req.url)
    const adminLoginUrl = new URL("/admin-login", req.url)

    if (!token) {
      const callbackUrl = `${pathname}${req.nextUrl.search}`

      if (pathname.startsWith("/admin")) {
        adminLoginUrl.searchParams.set("callbackUrl", callbackUrl)
        return NextResponse.redirect(adminLoginUrl)
      }

      loginUrl.searchParams.set("callbackUrl", callbackUrl)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      adminLoginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`)
      return NextResponse.redirect(adminLoginUrl)
    }

    if (pathname.startsWith("/dashboard") && token?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/orders/:path*"],
}
