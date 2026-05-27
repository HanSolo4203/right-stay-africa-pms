import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getUser } from "@/lib/auth/get-user"

type DashboardGroupLayoutProps = {
  children: React.ReactNode
}

export default async function DashboardGroupLayout({ children }: DashboardGroupLayoutProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const showSettings = user.role === "SUPER_ADMIN" || user.role === "PROPERTY_MANAGER"

  return (
    <DashboardShell email={user.email} role={user.role} showSettings={showSettings}>
      {children}
    </DashboardShell>
  )
}
