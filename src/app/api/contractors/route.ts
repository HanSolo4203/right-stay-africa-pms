import { NextResponse } from "next/server"
import { assertMaintenanceApiAccess } from "@/lib/maintenance/api-auth"
import { contractorToJson } from "@/lib/maintenance/mappers"
import { prisma } from "@/lib/prisma"
import { createContractorSchema } from "@/lib/validations/maintenance"

export async function GET(request: Request) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get("includeInactive") === "true"

  const contractors = await prisma.contractor.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          jobs: { where: { status: { in: ["open", "in_progress"] } } },
        },
      },
    },
  })

  return NextResponse.json({
    contractors: contractors.map((c) => contractorToJson(c, c._count.jobs)),
  })
}

export async function POST(request: Request) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = createContractorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const data = parsed.data
  const created = await prisma.contractor.create({
    data: {
      name: data.name.trim(),
      trade: data.trade?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      company: data.company?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  })

  return NextResponse.json({ contractor: contractorToJson(created, 0) })
}
