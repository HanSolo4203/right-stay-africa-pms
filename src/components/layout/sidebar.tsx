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

function isNavLinkActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

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

  const importActive = pathname === "/bookings/import" || pathname.startsWith("/bookings/import/")

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-50 to-white shadow-[inset_-1px_0_0_0_rgb(226_232_240_/_0.6)]">
      <div className="border-b border-slate-200/80 px-5 py-5">
        <p className="text-[15px] font-semibold tracking-tight text-green-800">Right Stay Africa</p>
        <p className="mt-0.5 text-xs text-slate-500">Portfolio management</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {links.map((link) => {
          const isActive = isNavLinkActive(pathname, link.href)
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-[9px] text-sm font-medium transition-all",
                isActive
                  ? "border-l-emerald-600 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                  : "border-l-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive ? "text-emerald-700" : "text-slate-500")} />
              {link.label}
            </Link>
          )
        })}

        {showImports ? (
          <div className="mt-5 border-t border-slate-200/80 pt-4">
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Imports</p>
            <Link
              href="/bookings/import"
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pr-3 pl-[9px] text-sm font-medium transition-all",
                importActive
                  ? "border-l-emerald-600 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                  : "border-l-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet
                className={cn("size-4 shrink-0", importActive ? "text-emerald-700" : "text-slate-500")}
              />
              Booking CSV import
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-200/80 bg-slate-50/50 p-4">
        <p className="truncate text-sm font-medium text-slate-900">{email ?? "Unknown user"}</p>
        <Badge variant="outline" className="mt-2 border-emerald-200/80 bg-emerald-50/80 text-emerald-900">
          {role ?? "NO_ROLE"}
        </Badge>
        <Button variant="outline" className="mt-3 w-full justify-start border-slate-200 bg-white hover:bg-slate-50" onClick={onSignOut}>
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
