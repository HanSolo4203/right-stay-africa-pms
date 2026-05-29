import { addDays, startOfDay, startOfWeek } from "date-fns"
import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const today = startOfDay(new Date())
  const next7 = addDays(today, 7)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })

  const [overdue, todayCount, next7Count, completedThisWeek] = await Promise.all([
    prisma.cleaningTask.count({
      where: { scheduled_for: { lt: today }, status: "scheduled" },
    }),
    prisma.cleaningTask.count({
      where: {
        scheduled_for: { gte: today, lt: addDays(today, 1) },
        status: "scheduled",
      },
    }),
    prisma.cleaningTask.count({
      where: {
        scheduled_for: { gte: today, lte: next7 },
        status: "scheduled",
      },
    }),
    prisma.cleaningTask.count({
      where: {
        status: "completed",
        completed_at: { gte: weekStart },
      },
    }),
  ])

  return NextResponse.json({ overdue, todayCount, next7Count, completedThisWeek })
}

