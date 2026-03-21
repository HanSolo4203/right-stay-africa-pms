"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type OwnerPortalTabNavProps = {
  propertyId: string
}

const tabs = [
  { label: "Overview", href: (id: string) => `/owner-portal/${id}` },
  { label: "Statements", href: (id: string) => `/owner-portal/${id}/statements` },
  { label: "Bookings", href: (id: string) => `/owner-portal/${id}/bookings` },
  { label: "Info Guide", href: (id: string) => `/owner-portal/${id}/info-guide` },
] as const

export function OwnerPortalTabNav({ propertyId }: OwnerPortalTabNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin sm:flex-wrap sm:overflow-visible"
      aria-label="Owner portal sections"
    >
      {tabs.map((tab) => {
        const href = tab.href(propertyId)
        const isOverview = tab.label === "Overview"
        const base = `/owner-portal/${propertyId}`
        const isActive = isOverview
          ? pathname === base || pathname === `${base}/`
          : pathname === href

        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-green-100 text-green-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
