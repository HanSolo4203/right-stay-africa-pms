import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { syncAllOwnersToClients } from "@/lib/clients/sync-owner-to-client"

export async function POST() {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await syncAllOwnersToClients()
    revalidatePath("/clients")
    revalidatePath("/clients/statements")
    revalidatePath("/clients/management-fees")
    revalidatePath("/clients/account-details")
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
