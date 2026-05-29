"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardTopbar } from "@/components/layout/dashboard-topbar"
import { Toaster } from "@/components/ui/sonner"

type DashboardShellProps = {
  children: ReactNode
  email: string | null
  role: string | null
  showSettings: boolean
}

/** Single client boundary for dashboard chrome (avoids hook/runtime issues across RSC splits). */
export function DashboardShell({ children, email, role, showSettings }: DashboardShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [sidebarOpen])

  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  return (
    <div className="spike-admin spike-admin-canvas min-h-screen">
      <button
        type="button"
        className="spike-sidebar-backdrop lg:hidden"
        data-open={sidebarOpen}
        aria-label="Close menu"
        onClick={closeSidebar}
      />
      <Sidebar
        email={email}
        role={role}
        mobileOpen={sidebarOpen}
        onNavigate={closeSidebar}
        onClose={closeSidebar}
      />
      <div className="spike-main flex flex-col">
        <DashboardTopbar
          email={email}
          role={role}
          showSettings={showSettings}
          onOpenSidebar={openSidebar}
        />
        <div className="flex-1 px-0 py-4 sm:py-6">
          <div className="spike-main-inner w-full">{children}</div>
        </div>
      </div>
      <Toaster theme="dark" />
    </div>
  )
}
