import { getUser } from "@/lib/auth/get-user"

export async function assertClientsApiAccess() {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    return null
  }
  return user
}
