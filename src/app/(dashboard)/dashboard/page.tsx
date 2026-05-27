import { DashboardHomeView } from "@/components/dashboard/dashboard-home-view"
import { getUser } from "@/lib/auth/get-user"
import { getUserDisplayName } from "@/lib/auth/user-display"

export default async function DashboardHomePage() {
  const user = await getUser()
  const displayName = getUserDisplayName(user)

  return <DashboardHomeView displayName={displayName} />
}
