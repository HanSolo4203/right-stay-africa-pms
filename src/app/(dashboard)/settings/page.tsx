import { Suspense } from "react"
import { redirect } from "next/navigation"
import { CompanySettingsForm } from "@/components/settings/company-settings-form"
import { Skeleton } from "@/components/ui/skeleton"
import { getUser } from "@/lib/auth/get-user"

function SettingsFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  )
}

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your company information and branding
        </p>
      </div>
      <Suspense fallback={<SettingsFallback />}>
        <CompanySettingsForm />
      </Suspense>
    </section>
  )
}
