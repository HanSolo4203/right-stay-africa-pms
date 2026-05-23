import { redirect } from "next/navigation"
import { ClientsList, type ClientListItem } from "@/components/clients/clients-list"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

export default async function ClientsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  const [clients, availableProperties, ownerCount] = await Promise.all([
    prisma.client.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { properties: true } } },
    }),
    prisma.property.findMany({
      where: { client_id: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.owner.count(),
  ])

  const list: ClientListItem[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    status: c.status,
    propertyCount: c._count.properties,
  }))

  return (
    <ClientsList
      clients={list}
      availableProperties={availableProperties}
      ownerCount={ownerCount}
    />
  )
}
