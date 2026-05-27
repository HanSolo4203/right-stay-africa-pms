import { NextResponse } from "next/server"
import { assertMaintenanceApiAccess } from "@/lib/maintenance/api-auth"
import { appendMaintenanceNote } from "@/lib/maintenance/job-notes"
import { maintenanceJobToJson } from "@/lib/maintenance/mappers"
import { PRIORITY_ORDER } from "@/lib/maintenance/constants"
import { prisma } from "@/lib/prisma"
import {
  createMaintenanceJobSchema,
  listMaintenanceJobsSchema,
} from "@/lib/validations/maintenance"

const jobInclude = {
  property: { select: { id: true, name: true, unit_number: true, client_id: true } },
  contractor: { select: { id: true, name: true, phone: true, trade: true, email: true } },
} as const

function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d
}

export async function GET(request: Request) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = listMaintenanceJobsSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    propertyId: searchParams.get("propertyId") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    )
  }

  const { status, propertyId, priority, category, search } = parsed.data

  const rows = await prisma.maintenanceJob.findMany({
    where: {
      ...(status && { status }),
      ...(propertyId && { propertyId }),
      ...(priority && { priority }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: jobInclude,
    orderBy: [{ reportedAt: "desc" }],
  })

  rows.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
      b.reportedAt.getTime() - a.reportedAt.getTime()
  )

  return NextResponse.json({ jobs: rows.map((j) => maintenanceJobToJson(j)) })
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

  const parsed = createMaintenanceJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const data = parsed.data
  const property = await prisma.property.findUnique({
    where: { id: data.propertyId },
    select: { id: true },
  })
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  const notes = appendMaintenanceNote(null, {
    type: "system",
    text: "Job created",
  })

  const created = await prisma.maintenanceJob.create({
    data: {
      propertyId: data.propertyId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category,
      priority: data.priority,
      status: data.status ?? "open",
      contractorId: data.contractorId ?? null,
      contractorName: data.contractorName?.trim() || null,
      contractorPhone: data.contractorPhone?.trim() || null,
      scheduledFor: parseOptionalDate(data.scheduledFor),
      dueBy: parseOptionalDate(data.dueBy),
      estimatedCost: data.estimatedCost ?? null,
      actualCost: data.actualCost ?? null,
      currency: data.currency ?? "ZAR",
      chargeToOwner: data.chargeToOwner ?? false,
      ownerStatementNote: data.ownerStatementNote?.trim() || null,
      notes: data.notes ? appendMaintenanceNote(notes, { type: "manual", text: data.notes }) : notes,
    },
    include: jobInclude,
  })

  return NextResponse.json({ job: maintenanceJobToJson(created) })
}
