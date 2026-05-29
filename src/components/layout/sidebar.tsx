"use client"

import Link from "next/link"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings,
  SprayCan,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

type SidebarProps = {
  email: string | null
  role: string | null
  mobileOpen?: boolean
  onNavigate?: () => void
  onClose?: () => void
}

const links = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/properties", icon: Building2 },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { label: "Cleaning", href: "/cleaning", icon: SprayCan },
  { label: "Reports", href: "/reports", icon: BarChart3 },
]

const canManageImports = (role: string | null) =>
  role === "SUPER_ADMIN" || role === "PROPERTY_MANAGER"

function isNavLinkActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ email, role, mobileOpen = false, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const showImports = canManageImports(role)
  const showSettings = role === "SUPER_ADMIN" || role === "PROPERTY_MANAGER"

  useEffect(() => {
    for (const link of links) {
      router.prefetch(link.href)
    }
    if (showImports) {
      router.prefetch("/bookings/import")
    }
    router.prefetch("/reports")
    if (showSettings) {
      router.prefetch("/settings")
    }
  }, [router, showImports, showSettings])

  const onSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const importActive = pathname === "/bookings/import" || pathname.startsWith("/bookings/import/")
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/")

  return (
    <aside
      className="spike-sidebar fixed z-30 flex shrink-0 flex-col"
      data-open={mobileOpen}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--spike-glass-border)] px-5 py-5">
        <Link href="/dashboard" className="min-w-0" onClick={onNavigate}>
          <p className="spike-sidebar-brand truncate text-lg font-bold tracking-tight">
            Right Stay Africa
          </p>
          <p className="mt-0.5 truncate text-xs spike-text-muted">Portfolio management</p>
        </Link>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg spike-text-secondary transition hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)] lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <p className="spike-nav-cap">Home</p>
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = isNavLinkActive(pathname, link.href)
            const Icon = link.icon

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-active={isActive}
                  className="spike-sidebar-link"
                  onClick={onNavigate}
                >
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0",
                      isActive ? "text-[var(--spike-primary)]" : "spike-text-muted"
                    )}
                  />
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {showImports ? (
          <>
            <p className="spike-nav-cap mt-6">Operations</p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/bookings/import"
                  data-active={importActive}
                  className="spike-sidebar-link"
                  onClick={onNavigate}
                >
                  <FileSpreadsheet
                    className={cn(
                      "size-[18px] shrink-0",
                      importActive ? "text-[var(--spike-primary)]" : "spike-text-muted"
                    )}
                  />
                  Booking CSV import
                </Link>
              </li>
            </ul>
          </>
        ) : null}

        {showSettings ? (
          <ul className="mt-auto space-y-1 border-t border-[var(--spike-glass-border)] pt-4">
            <li>
              <Link
                href="/settings"
                data-active={settingsActive}
                className="spike-sidebar-link"
                onClick={onNavigate}
              >
                <Settings
                  className={cn(
                    "size-[18px] shrink-0",
                    settingsActive ? "text-[var(--spike-primary)]" : "spike-text-muted"
                  )}
                />
                Settings
              </Link>
            </li>
          </ul>
        ) : null}
      </nav>

      <div className="border-t border-[var(--spike-glass-border)] p-4 lg:hidden">
        <p className="truncate text-xs spike-text-muted">{email}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full border-[var(--spike-glass-border)] bg-transparent spike-text-secondary hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)]"
          onClick={() => void onSignOut()}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
