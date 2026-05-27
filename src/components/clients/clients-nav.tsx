"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "Clients", href: "/clients" },
  { label: "Statements", href: "/clients/statements" },
  { label: "Management Fees", href: "/clients/management-fees" },
  { label: "Account Details", href: "/clients/account-details" },
] as const

export function ClientsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--spike-glass-border)] pb-3 lg:w-52 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:pr-4 lg:pb-0">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/clients"
            ? pathname === "/clients" || pathname === "/clients/"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-active={isActive}
            className="spike-sidebar-link shrink-0 whitespace-nowrap lg:whitespace-normal"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
