import { format, parseISO } from "date-fns"
import { BookingStatus } from "@prisma/client"
import type { DashboardActivityItem } from "@/lib/dashboard/types"
import { prisma } from "@/lib/prisma"

function formatActivityTime(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return format(d, "HH:mm")
}

const ACCENTS: DashboardActivityItem["accent"][] = [
  "primary",
  "info",
  "success",
  "warning",
  "danger",
  "success",
]

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

export async function fetchDashboardRecentActivity(limit = 6): Promise<DashboardActivityItem[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: { not: BookingStatus.CANCELLED },
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      guest_name: true,
      created_at: true,
      gross_revenue: true,
      total: true,
      property: { select: { name: true } },
    },
  })

  return rows.map((row, index) => {
    const gross = row.gross_revenue != null ? Number(row.gross_revenue) : Number(row.total)
    const amount =
      Number.isFinite(gross) && gross > 0 ? ` · ${formatMoney(gross)}` : ""

    return {
      id: row.id,
      timeLabel: formatActivityTime(row.created_at.toISOString()),
      description: `Booking for ${row.guest_name} at ${row.property.name}${amount}`,
      accent: ACCENTS[index % ACCENTS.length]!,
    }
  })
}
