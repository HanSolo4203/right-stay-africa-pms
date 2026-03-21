"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

function ensureManagerRole(role: string | null | undefined) {
  if (role !== "SUPER_ADMIN" && role !== "PROPERTY_MANAGER") {
    throw new Error("Unauthorized.")
  }
}

const authUserIdSchema = z.string().uuid("Select a valid user.")

export async function linkOwnerPortalUser(propertyId: string, supabaseAuthUserId: string) {
  const user = await getUser()
  ensureManagerRole(user?.role)

  const parsedId = authUserIdSchema.safeParse(supabaseAuthUserId)
  if (!parsedId.success) {
    throw new Error(parsedId.error.issues[0]?.message ?? "Invalid user.")
  }

  const owner = await prisma.owner.findUnique({
    where: { property_id: propertyId },
    select: { id: true },
  })

  if (!owner) {
    throw new Error("Add owner details for this property before linking a portal account.")
  }

  await prisma.$transaction([
    prisma.owner.updateMany({
      where: {
        portal_user_id: parsedId.data,
        property_id: { not: propertyId },
      },
      data: { portal_user_id: null },
    }),
    prisma.owner.update({
      where: { property_id: propertyId },
      data: { portal_user_id: parsedId.data },
    }),
  ])

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/dashboard/properties/${propertyId}/owner-portal`)
  revalidatePath("/dashboard/owners")
  revalidatePath("/owner-portal")
}

export async function unlinkOwnerPortalUser(propertyId: string) {
  const user = await getUser()
  ensureManagerRole(user?.role)

  await prisma.owner.updateMany({
    where: { property_id: propertyId },
    data: { portal_user_id: null },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/dashboard/properties/${propertyId}/owner-portal`)
  revalidatePath("/dashboard/owners")
  revalidatePath("/owner-portal")
}
