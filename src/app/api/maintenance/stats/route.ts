import { NextResponse } from "next/server"
import { startOfMonth } from "date-fns"
import { assertMaintenanceApiAccess } from "@/lib/maintenance/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await assertMaintenanceApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const startOfThisMonth = startOfMonth(new Date())

  const [open, inProgress, urgent, completedThisMonth] = await Promise.all([
    prisma.maintenanceJob.count({ where: { status: "open" } }),
    prisma.maintenanceJob.count({ where: { status: "in_progress" } }),
    prisma.maintenanceJob.count({
      where: {
        status: { in: ["open", "in_progress"] },
        priority: "urgent",
      },
    }),
    prisma.maintenanceJob.count({
      where: {
        status: "completed",
        completedAt: { gte: startOfThisMonth },
      },
    }),
  ])

  return NextResponse.json({ open, inProgress, urgent, completedThisMonth })
}
