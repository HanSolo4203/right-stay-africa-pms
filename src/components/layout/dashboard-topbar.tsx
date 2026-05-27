"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Bell, LogOut, Menu, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/properties": "Properties",
  "/clients": "Clients",
  "/clients/statements": "Statements",
  "/clients/management-fees": "Management fees",
  "/clients/account-details": "Account details",
  "/bookings/import": "Booking import",
  "/settings": "Settings",
}

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith("/dashboard/properties/")) return "Property"
  if (pathname.startsWith("/clients")) return "Clients"
  return "Admin"
}

type DashboardTopbarProps = {
  email: string | null
  role: string | null
  showSettings?: boolean
  onOpenSidebar?: () => void
}

export function DashboardTopbar({ email, role, showSettings, onOpenSidebar }: DashboardTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const title = resolvePageTitle(pathname)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [accountOpen])

  const onSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = (email?.split("@")[0] ?? "U").slice(0, 2).toUpperCase()

  return (
    <header className="spike-topbar sticky top-0 z-20">
      <nav className="flex h-[70px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg spike-text-secondary transition hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)] lg:hidden"
            aria-label="Open menu"
            onClick={onOpenSidebar}
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight spike-heading">{title}</p>
            <p className="hidden truncate text-xs spike-text-muted sm:block">
              Right Stay Africa · Portfolio management
            </p>
          </div>
        </div>

        <ul className="flex shrink-0 items-center gap-1 sm:gap-2">
          <li>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 spike-text-secondary hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)]"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--spike-accent-pink)] shadow-[0_0_8px_var(--spike-accent-pink)]"
                aria-hidden
              />
            </Button>
          </li>

          <li className="relative">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-xs font-semibold text-[#0a0a10]",
                  "bg-gradient-to-br from-[var(--spike-primary)] to-[var(--spike-accent-purple)]",
                  "ring-2 ring-[var(--spike-primary-subtle)] transition hover:opacity-90"
                )}
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                {initials}
              </button>
              {accountOpen ? (
                <div
                  className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--spike-glass-border)] bg-[rgba(12,12,18,0.95)] py-1 shadow-2xl backdrop-blur-xl"
                  role="menu"
                >
                  <div className="border-b border-[var(--spike-glass-border)] px-3 py-2">
                    <p className="truncate text-sm font-medium spike-heading">{email ?? "Unknown user"}</p>
                    <p className="text-xs spike-text-muted">{role ?? "NO_ROLE"}</p>
                  </div>
                  {showSettings ? (
                    <Link
                      href="/settings"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm spike-text-secondary transition hover:bg-[var(--spike-primary-subtle)] hover:spike-heading"
                    >
                      <Settings className="size-4 spike-text-muted" />
                      Settings
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm spike-text-secondary transition hover:bg-[var(--spike-primary-subtle)] hover:spike-heading"
                  >
                    <User className="size-4 spike-text-muted" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--spike-accent-pink)] transition hover:bg-[rgba(255,55,95,0.12)]"
                    onClick={() => void onSignOut()}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        </ul>
      </nav>
    </header>
  )
}
