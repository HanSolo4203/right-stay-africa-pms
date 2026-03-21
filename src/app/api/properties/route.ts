import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

/**
 * Minimal property list for linking Uplisting IDs (admin / manager).
 */
export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      uplisting_id: true,
    },
  })

  return NextResponse.json({ properties })
}
