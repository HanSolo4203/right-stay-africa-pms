"use client"

import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Building2, FileSpreadsheet, LayoutDashboard, LogOut, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

type SidebarProps = {
  email: string | null
  role: string | null
}

const links = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/properties", icon: Building2 },
  { label: "Owners", href: "/dashboard/owners", icon: Users },
]

const canManageImports = (role: string | null) =>
  role === "SUPER_ADMIN" || role === "PROPERTY_MANAGER"

export function Sidebar({ email, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const showImports = canManageImports(role)

  useEffect(() => {
    for (const link of links) {
      router.prefetch(link.href)
    }
    if (showImports) {
      router.prefetch("/bookings/import")
    }
  }, [router, showImports])

  const onSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-lg font-bold tracking-tight text-green-700">Right Stay Africa</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-green-100 text-green-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          )
        })}

        {showImports ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Imports</p>
            <Link
              href="/bookings/import"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/bookings/import" || pathname.startsWith("/bookings/import/")
                  ? "bg-green-100 text-green-800"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet className="size-4" />
              Booking CSV import
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium text-slate-900">{email ?? "Unknown user"}</p>
        <Badge variant="outline" className="mt-2 border-green-200 bg-green-50 text-green-800">
          {role ?? "NO_ROLE"}
        </Badge>
        <Button variant="outline" className="mt-3 w-full justify-start" onClick={onSignOut}>
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
