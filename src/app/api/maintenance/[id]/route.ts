import { NextResponse } from "next/server"
import { assertMaintenanceApiAccess } from "@/lib/maintenance/api-auth"
import { appendMaintenanceNote } from "@/lib/maintenance/job-notes"
import { maintenanceJobToJson } from "@/lib/maintenance/mappers"
import {
  maybeCreateMaintenanceStatementExpense,
  notesWithExpense,
} from "@/lib/maintenance/statement-expense"
import { prisma } from "@/lib/prisma"
import { updateMaintenanceJobSchema } from "@/lib/validations/maintenance"

const jobInclude = {
  property: { select: { id: true, name: true, unit_number: true, client_id: true } },
  contractor: { select: { id: true, name: true, phone: true, trade: true, email: true } },
} as const

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const job = await prisma.maintenanceJob.findUnique({
    where: { id },
    include: jobInclude,
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  return NextResponse.json({ job: maintenanceJobToJson(job) })
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.maintenanceJob.findUnique({
    where: { id },
    include: jobInclude,
  })
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = updateMaintenanceJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const data = parsed.data
  let notes = existing.notes
  let expenseCreated = false
  let expenseMonth: number | undefined
  let expenseYear: number | undefined

  if (data.status && data.status !== existing.status) {
    notes = appendMaintenanceNote(notes, {
      type: "system",
      text: `Status changed from ${existing.status} to ${data.status}`,
    })
  }

  if (data.contractorId !== undefined && data.contractorId !== existing.contractorId) {
    if (data.contractorId) {
      const c = await prisma.contractor.findUnique({ where: { id: data.contractorId } })
      notes = appendMaintenanceNote(notes, {
        type: "system",
        text: c ? `Contractor assigned: ${c.name}` : "Contractor assigned",
      })
    }
  }

  const scheduledFor = parseOptionalDate(data.scheduledFor)
  if (scheduledFor !== undefined && scheduledFor?.toISOString() !== existing.scheduledFor?.toISOString()) {
    if (scheduledFor) {
      notes = appendMaintenanceNote(notes, {
        type: "system",
        text: `Scheduled for ${scheduledFor.toLocaleDateString("en-ZA", { dateStyle: "medium" })}`,
      })
    }
  }

  const nextStatus = data.status ?? existing.status
  const completedAt =
    nextStatus === "completed"
      ? parseOptionalDate(data.completedAt) ?? existing.completedAt ?? new Date()
      : nextStatus === "open" || nextStatus === "in_progress"
        ? null
        : existing.completedAt

  const updated = await prisma.maintenanceJob.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && {
        description: data.description?.trim() || null,
      }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contractorId !== undefined && { contractorId: data.contractorId }),
      ...(data.contractorName !== undefined && {
        contractorName: data.contractorName?.trim() || null,
      }),
      ...(data.contractorPhone !== undefined && {
        contractorPhone: data.contractorPhone?.trim() || null,
      }),
      ...(scheduledFor !== undefined && { scheduledFor }),
      ...(parseOptionalDate(data.dueBy) !== undefined && {
        dueBy: parseOptionalDate(data.dueBy),
      }),
      ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost }),
      ...(data.actualCost !== undefined && { actualCost: data.actualCost }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.chargeToOwner !== undefined && { chargeToOwner: data.chargeToOwner }),
      ...(data.ownerStatementNote !== undefined && {
        ownerStatementNote: data.ownerStatementNote?.trim() || null,
      }),
      completedAt,
      notes,
    },
    include: jobInclude,
  })

  const chargeToOwner = data.chargeToOwner ?? updated.chargeToOwner
  const actualCost = data.actualCost ?? updated.actualCost

  if (
    nextStatus === "completed" &&
    existing.status !== "completed" &&
    chargeToOwner &&
    actualCost &&
    actualCost > 0 &&
    updated.property?.client_id
  ) {
    const result = await maybeCreateMaintenanceStatementExpense(
      {
        id: updated.id,
        propertyId: updated.propertyId,
        title: updated.title,
        ownerStatementNote: updated.ownerStatementNote,
        actualCost,
        chargeToOwner: true,
        notes: updated.notes,
        completedAt: completedAt ?? new Date(),
      },
      { client_id: updated.property.client_id }
    )
    if (result.expenseCreated && result.expenseId && result.month && result.year) {
      expenseCreated = true
      expenseMonth = result.month
      expenseYear = result.year
      const monthLabel = new Date(result.year, result.month - 1, 1).toLocaleDateString("en-ZA", {
        month: "long",
        year: "numeric",
      })
      const notesWithExp = notesWithExpense(
        updated.notes,
        `Expense added to ${monthLabel} statement`,
        result.expenseId
      )
      const finalJob = await prisma.maintenanceJob.update({
        where: { id },
        data: { notes: notesWithExp },
        include: jobInclude,
      })
      return NextResponse.json({
        job: maintenanceJobToJson(finalJob, { expenseCreated: true }),
        expenseMonth: result.month,
        expenseYear: result.year,
      })
    }
  }

  return NextResponse.json({
    job: maintenanceJobToJson(updated, expenseCreated ? { expenseCreated: true } : undefined),
    expenseMonth,
    expenseYear,
  })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.maintenanceJob.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  if (existing.status !== "open" || existing.actualCost || existing.estimatedCost) {
    const updated = await prisma.maintenanceJob.update({
      where: { id },
      data: {
        status: "cancelled",
        notes: appendMaintenanceNote(existing.notes, {
          type: "system",
          text: "Job cancelled",
        }),
      },
      include: jobInclude,
    })
    return NextResponse.json({ job: maintenanceJobToJson(updated), softDeleted: true })
  }

  await prisma.maintenanceJob.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
