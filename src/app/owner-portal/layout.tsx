import { redirect } from "next/navigation"
import Link from "next/link"
import { OwnerPortalSignOut } from "@/components/owner-portal/owner-portal-sign-out"
import { Toaster } from "@/components/ui/sonner"
import { getUser } from "@/lib/auth/get-user"

type OwnerPortalLayoutProps = {
  children: React.ReactNode
}

export default async function OwnerPortalLayout({ children }: OwnerPortalLayoutProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "OWNER") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/owner-portal" className="text-lg font-bold tracking-tight text-green-700">
            Right Stay Africa
          </Link>
          <OwnerPortalSignOut />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
      <Toaster />
    </div>
  )
}
