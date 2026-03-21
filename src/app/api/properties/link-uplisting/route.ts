import { NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  property_db_id: z.string().uuid("Invalid property id."),
  uplisting_id: z.string().min(1, "Uplisting ID is required.").max(64),
})

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    let json: unknown
    try {
      json = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 }
      )
    }

    const uplistingId = parsed.data.uplisting_id.trim()
    const propertyDbId = parsed.data.property_db_id

    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyDbId },
    })
    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 })
    }

    const conflict = await prisma.property.findFirst({
      where: {
        uplisting_id: uplistingId,
        NOT: { id: propertyDbId },
      },
      select: { id: true, name: true },
    })

    if (conflict) {
      return NextResponse.json(
        {
          error: `Uplisting ID ${uplistingId} is already linked to property "${conflict.name}".`,
        },
        { status: 409 }
      )
    }

    const property = await prisma.property.update({
      where: { id: propertyDbId },
      data: { uplisting_id: uplistingId },
    })

    return NextResponse.json({ property })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to link property."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
