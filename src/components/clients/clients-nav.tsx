"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Clients", href: "/clients" },
  { label: "Statements", href: "/clients/statements" },
  { label: "Management Fees", href: "/clients/management-fees" },
  { label: "Account Details", href: "/clients/account-details" },
] as const

export function ClientsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-slate-200/80 pr-4">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/clients"
            ? pathname === "/clients" || pathname === "/clients/"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
