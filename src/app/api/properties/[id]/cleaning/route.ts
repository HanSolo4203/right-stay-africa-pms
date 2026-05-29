import { endOfMonth, format, startOfMonth } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { cleaningTaskInclude, serializeCleaningTask } from "@/lib/cleaning/serialize"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id: propertyId } = await context.params
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true },
  })
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)

  if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Invalid month or year." }, { status: 400 })
  }

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))

  const tasks = await prisma.cleaningTask.findMany({
    where: {
      property_id: propertyId,
      scheduled_for: { gte: monthStart, lte: monthEnd },
    },
    include: cleaningTaskInclude,
    orderBy: { scheduled_for: "asc" },
  })

  let record: Awaited<
    ReturnType<typeof prisma.propertyCleaningMonthRecord.findUnique>
  > = null
  if (prisma.propertyCleaningMonthRecord) {
    record = await prisma.propertyCleaningMonthRecord.findUnique({
      where: {
        property_id_month_year: { property_id: propertyId, month, year },
      },
    })
  }

  const serialized = tasks.map(serializeCleaningTask)
  const byDate: Record<string, typeof serialized> = {}
  for (const task of serialized) {
    const key = format(new Date(task.scheduledDate), "yyyy-MM-dd")
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(task)
  }

  return NextResponse.json({
    propertyId,
    propertyName: property.name,
    month,
    year,
    tasks: serialized,
    byDate,
    summary: {
      taskCount: tasks.length,
      completedCount: tasks.filter((t) => t.status === "completed").length,
      skippedCount: tasks.filter((t) => t.status === "skipped").length,
      scheduledCount: tasks.filter((t) => t.status === "scheduled").length,
      manualOverrideCount: tasks.filter((t) => t.is_manual_override).length,
      lastRecordedAt: record?.updated_at ?? null,
    },
    monthRecord: record
      ? {
          taskCount: record.task_count,
          completedCount: record.completed_count,
          skippedCount: record.skipped_count,
          updatedAt: record.updated_at,
          snapshot: record.snapshot,
        }
      : null,
  })
}
