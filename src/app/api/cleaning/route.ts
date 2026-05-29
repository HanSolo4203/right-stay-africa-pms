import { addDays, format, startOfDay } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { createManualCleaningTask } from "@/lib/cleaning/manual-task"
import { cleaningTaskInclude, serializeCleaningTask } from "@/lib/cleaning/serialize"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const today = startOfDay(new Date())

  const from = searchParams.get("from")
    ? new Date(String(searchParams.get("from")))
    : today
  const to = searchParams.get("to")
    ? new Date(String(searchParams.get("to")))
    : addDays(today, 30)

  const propertyId = searchParams.get("propertyId") || undefined
  const status = searchParams.get("status") || undefined
  const type = searchParams.get("type") || undefined

  const rows = await prisma.cleaningTask.findMany({
    where: {
      scheduled_for: { gte: from, lte: to },
      ...(propertyId && { property_id: propertyId }),
      ...(status && { status }),
      ...(type && { type }),
    },
    include: cleaningTaskInclude,
    orderBy: { scheduled_for: "asc" },
  })

  const tasks = rows.map(serializeCleaningTask)

  const grouped: Record<string, typeof tasks> = {}
  for (const task of tasks) {
    const key = format(task.scheduledDate, "yyyy-MM-dd")
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(task)
  }

  return NextResponse.json({ tasks, grouped })
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { propertyId, scheduledDate, type, status, notes, cleanerName } = body as {
    propertyId?: string
    scheduledDate?: string
    type?: string
    status?: string
    notes?: string
    cleanerName?: string
  }

  if (!propertyId?.trim()) {
    return NextResponse.json({ error: "Property is required." }, { status: 400 })
  }
  if (!scheduledDate?.trim()) {
    return NextResponse.json({ error: "Scheduled date is required." }, { status: 400 })
  }

  const result = await createManualCleaningTask(prisma, {
    propertyId: propertyId.trim(),
    scheduledDate: scheduledDate.trim(),
    type: type as "checkout" | "midstay" | "manual" | undefined,
    status: status as "scheduled" | "completed" | "skipped" | undefined,
    notes,
    cleanerName,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ task: result.task }, { status: 201 })
}

