import type { ReactNode } from "react"
import { ClientsLayoutShell } from "@/app/(dashboard)/clients/clients-layout-shell"

type ClientsLayoutProps = {
  children: ReactNode
}

export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return <ClientsLayoutShell>{children}</ClientsLayoutShell>
}
