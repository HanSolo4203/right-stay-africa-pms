import { NextResponse } from "next/server"
import { assertMaintenanceApiAccess } from "@/lib/maintenance/api-auth"
import { contractorToJson } from "@/lib/maintenance/mappers"
import { prisma } from "@/lib/prisma"
import { updateContractorSchema } from "@/lib/validations/maintenance"

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: RouteContext) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = updateContractorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const data = parsed.data
  try {
    const updated = await prisma.contractor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.trade !== undefined && { trade: data.trade?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.company !== undefined && { company: data.company?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: {
          select: {
            jobs: { where: { status: { in: ["open", "in_progress"] } } },
          },
        },
      },
    })
    return NextResponse.json({
      contractor: contractorToJson(updated, updated._count.jobs),
    })
  } catch {
    return NextResponse.json({ error: "Contractor not found." }, { status: 404 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  try {
    const updated = await prisma.contractor.update({
      where: { id },
      data: { isActive: false },
      include: {
        _count: {
          select: {
            jobs: { where: { status: { in: ["open", "in_progress"] } } },
          },
        },
      },
    })
    return NextResponse.json({
      contractor: contractorToJson(updated, updated._count.jobs),
    })
  } catch {
    return NextResponse.json({ error: "Contractor not found." }, { status: 404 })
  }
}
