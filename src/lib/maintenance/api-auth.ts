import { getUser } from "@/lib/auth/get-user"

export async function assertMaintenanceApiAccess() {
  const user = await getUser()
  if (!user) return null
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") return null
  return user
}
