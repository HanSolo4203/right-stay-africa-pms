"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Monthly", href: "/reports/monthly" },
  { label: "Properties", href: "/reports/properties" },
  { label: "Platforms", href: "/reports/platforms" },
] as const

export function ReportsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--spike-glass-border)] pb-3">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/reports"
            ? pathname === "/reports" || pathname === "/reports/"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-active={isActive}
            className="spike-sidebar-link shrink-0 whitespace-nowrap"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
