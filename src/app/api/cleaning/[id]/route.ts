import { startOfDay } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import {
  cleaningTaskInclude,
  serializeCleaningTask,
  type CleaningStatus,
  type CleaningType,
} from "@/lib/cleaning/serialize"
import { syncPropertyCleaningMonthRecordsForDates } from "@/lib/cleaning/property-month-record"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getUser()
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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { status, notes, scheduledDate, type, isManualOverride } = body as {
    status?: CleaningStatus
    notes?: string
    scheduledDate?: string
    type?: CleaningType
    isManualOverride?: boolean
  }

  const existing = await prisma.cleaningTask.findUnique({
    where: { id },
    select: { id: true, property_id: true, scheduled_for: true, booking_id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 })
  }

  const data: {
    status?: CleaningStatus
    completed_at?: Date | null
    notes?: string | null
    scheduled_for?: Date
    type?: CleaningType
    is_manual_override?: boolean
  } = {}

  if (status !== undefined) {
    if (!["scheduled", "completed", "skipped"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 })
    }
    data.status = status
    data.completed_at = status === "completed" ? new Date() : null
  }

  if (notes !== undefined) {
    data.notes = notes?.trim() || null
  }

  if (scheduledDate !== undefined) {
    data.scheduled_for = startOfDay(new Date(scheduledDate))
    data.is_manual_override = true
  }

  if (type !== undefined) {
    if (type !== "checkout" && type !== "midstay") {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 })
    }
    data.type = type
    data.is_manual_override = true
  }

  if (isManualOverride !== undefined) {
    data.is_manual_override = isManualOverride
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 })
  }

  const updated = await prisma.cleaningTask.update({
    where: { id },
    data,
    include: cleaningTaskInclude,
  })

  await syncPropertyCleaningMonthRecordsForDates(prisma, existing.property_id, [
    existing.scheduled_for,
    updated.scheduled_for,
  ])

  return NextResponse.json(serializeCleaningTask(updated))
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params

  const existing = await prisma.cleaningTask.findUnique({
    where: { id },
    select: { id: true, property_id: true, scheduled_for: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 })
  }

  await prisma.cleaningTask.delete({ where: { id } })

  await syncPropertyCleaningMonthRecordsForDates(prisma, existing.property_id, [
    existing.scheduled_for,
  ])

  return NextResponse.json({ ok: true })
}
