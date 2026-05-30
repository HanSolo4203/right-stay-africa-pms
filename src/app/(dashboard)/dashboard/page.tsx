import { DashboardHomeView } from "@/components/dashboard/dashboard-home-view"
import { getUser } from "@/lib/auth/get-user"
import { getUserDisplayName } from "@/lib/auth/user-display"
import { fetchDashboardData } from "@/lib/dashboard/fetch-dashboard-data"

export default async function DashboardHomePage() {
  const [user, initialData] = await Promise.all([getUser(), fetchDashboardData()])
  const displayName = getUserDisplayName(user)

  return <DashboardHomeView displayName={displayName} initialData={initialData} />
}
