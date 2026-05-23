import type { ReactNode } from "react"
import { ClientsNav } from "@/components/clients/clients-nav"

type ClientsLayoutProps = {
  children: ReactNode
}

export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] gap-6">
      <ClientsNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
