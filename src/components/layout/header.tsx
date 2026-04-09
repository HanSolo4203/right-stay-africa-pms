"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type HeaderProps = {
  title: string
}

export function Header({ title }: HeaderProps) {
  const pathname = usePathname()
  const isPropertiesPage =
    pathname === "/dashboard/properties" || pathname.startsWith("/dashboard/properties/")

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>

      {isPropertiesPage ? (
        <Button asChild className="bg-green-700 text-white hover:bg-green-800">
          <Link href="/dashboard/properties/new">
            <Plus className="size-4" />
            Add Property
          </Link>
        </Button>
      ) : null}
    </header>
  )
}
