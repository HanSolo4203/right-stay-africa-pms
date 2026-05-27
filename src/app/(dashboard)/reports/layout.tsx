import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { ReportsLayoutShell } from "@/app/(dashboard)/reports/reports-layout-shell"
import { getUser } from "@/lib/auth/get-user"

type ReportsLayoutProps = {
  children: ReactNode
}

export default async function ReportsLayout({ children }: ReportsLayoutProps) {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  return <ReportsLayoutShell>{children}</ReportsLayoutShell>
}
