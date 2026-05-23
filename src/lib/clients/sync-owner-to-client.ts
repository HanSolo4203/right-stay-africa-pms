import "server-only"

import { ClientStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Ensures a Property Owner tab record is reflected in the Clients hub:
 * upsert Client by email and set property.client_id.
 */
export async function syncOwnerToClient(propertyId: string): Promise<string | null> {
  const owner = await prisma.owner.findUnique({
    where: { property_id: propertyId },
    select: {
      full_name: true,
      phone: true,
      email: true,
      bank_name: true,
      account_number: true,
      branch_code: true,
    },
  })
  if (!owner) return null

  const email = normalizeEmail(owner.email)
  const name = owner.full_name.trim()

  const client = await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findUnique({ where: { email } })
    if (existing) {
      const updated = await tx.client.update({
        where: { id: existing.id },
        data: {
          name,
          phone: owner.phone.trim(),
          bank_name: owner.bank_name ?? existing.bank_name,
          account_holder: existing.account_holder ?? name,
          account_number: owner.account_number ?? existing.account_number,
          branch_code: owner.branch_code ?? existing.branch_code,
        },
      })
      await tx.property.update({
        where: { id: propertyId },
        data: { client_id: updated.id },
      })
      return updated
    }

    const created = await tx.client.create({
      data: {
        name,
        email,
        phone: owner.phone.trim(),
        status: ClientStatus.ACTIVE,
        bank_name: owner.bank_name,
        account_holder: name,
        account_number: owner.account_number,
        branch_code: owner.branch_code,
      },
    })
    await tx.property.update({
      where: { id: propertyId },
      data: { client_id: created.id },
    })
    return created
  })

  return client.id
}

export async function syncAllOwnersToClients(): Promise<{
  imported: number
  skipped: number
  totalOwners: number
}> {
  const owners = await prisma.owner.findMany({
    select: {
      property_id: true,
      property: { select: { client_id: true } },
    },
  })

  let imported = 0
  let skipped = 0

  for (const row of owners) {
    if (row.property.client_id != null) {
      skipped += 1
      continue
    }
    await syncOwnerToClient(row.property_id)
    imported += 1
  }

  return { imported, skipped, totalOwners: owners.length }
}
