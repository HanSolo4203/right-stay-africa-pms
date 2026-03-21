import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { getUser } from "@/lib/auth/get-user"

type DashboardGroupLayoutProps = {
  children: React.ReactNode
}

export default async function DashboardGroupLayout({ children }: DashboardGroupLayoutProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar email={user.email} role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}
