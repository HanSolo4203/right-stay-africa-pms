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
    <div className="flex min-h-screen bg-slate-100/80">
      <Sidebar email={user.email} role={user.role} />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
          aria-hidden
        />
        <main className="relative flex-1 p-6 sm:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}
