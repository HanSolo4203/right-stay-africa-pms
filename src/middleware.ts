import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type AppRole = "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER"

function getRoleFromMetadata(user: { user_metadata?: Record<string, unknown> } | null): AppRole | null {
  const rawRole = user?.user_metadata?.role
  if (rawRole === "SUPER_ADMIN" || rawRole === "PROPERTY_MANAGER" || rawRole === "OWNER") {
    return rawRole
  }
  return null
}

function getHomePathForRole(role: AppRole | null): string {
  if (role === "OWNER") return "/owner-portal"
  return "/dashboard"
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options as object) })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...(options as object) })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...(options as object) })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: "", ...(options as object) })
        },
      },
    }
  )

  // Refreshes/validates session on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/owner-portal")
  const isLoginRoute = pathname === "/login"
  const role = getRoleFromMetadata(user)

  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url))
  }

  if (user && pathname.startsWith("/owner-portal") && role !== "OWNER") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
