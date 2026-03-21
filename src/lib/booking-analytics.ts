import { BookingSource, BookingStatus, type Prisma } from "@prisma/client"
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  subDays,
  isValid as isValidDate,
} from "date-fns"
import { prisma } from "@/lib/prisma"

export type BookingAnalyticsFilters = {
  from: Date
  to: Date
  propertyId: string | null
  source: BookingSource | null
  statuses: BookingStatus[] | null
  csvOnly: boolean
}

const BOOKING_SOURCES = Object.values(BookingSource) as BookingSource[]
const BOOKING_STATUSES = Object.values(BookingStatus) as BookingStatus[]

/** Prisma 7 may return `_count` as a number or `{ _all: number }` depending on call shape. */
function prismaAggregateCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object" && "_all" in value) {
    const n = (value as { _all: unknown })._all
    return typeof n === "number" && Number.isFinite(n) ? n : 0
  }
  return 0
}

function parseYmd(value: unknown, fallback: Date): Date {
  if (typeof value !== "string") return fallback
  const t = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return fallback
  const d = parseISO(t)
  return isValidDate(d) ? d : fallback
}

export function parseBookingAnalyticsSearchParams(
  raw: Record<string, string | string[] | undefined> | undefined
): BookingAnalyticsFilters {
  const sp = raw ?? {}
  const get = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v[0] : v
  }

  const today = endOfDay(new Date())
  const defaultFrom = startOfDay(subDays(today, 89))

  let toD = endOfDay(parseYmd(get("to"), today))
  let fromD = startOfDay(parseYmd(get("from"), defaultFrom))

  if (fromD > toD) {
    fromD = defaultFrom
    toD = today
  }

  const propertyId = get("property")?.trim() || null

  const sourceRaw = get("source")?.trim().toUpperCase()
  const source =
    sourceRaw && BOOKING_SOURCES.includes(sourceRaw as BookingSource)
      ? (sourceRaw as BookingSource)
      : null

  const statusRaw = get("status")?.trim()
  let statuses: BookingStatus[] | null = null
  if (statusRaw && statusRaw !== "all") {
    const parts = statusRaw.split(",").map((s) => s.trim().toUpperCase())
    const filtered = parts.filter((s): s is BookingStatus =>
      BOOKING_STATUSES.includes(s as BookingStatus)
    )
    statuses = filtered.length ? filtered : null
  }

  const csvOnly = get("scope") === "csv"

  return {
    from: fromD,
    to: toD,
    propertyId,
    source,
    statuses,
    csvOnly,
  }
}

export function buildBookingAnalyticsWhere(filters: BookingAnalyticsFilters): Prisma.BookingWhereInput {
  const rangeStart = startOfDay(filters.from)
  const rangeEndExclusive = startOfDay(addDays(endOfDay(filters.to), 1))

  const overlap: Prisma.BookingWhereInput = {
    check_in: { lt: rangeEndExclusive },
    check_out: { gt: rangeStart },
  }

  const parts: Prisma.BookingWhereInput[] = [overlap]

  if (filters.propertyId) {
    parts.push({ property_id: filters.propertyId })
  }
  if (filters.source) {
    parts.push({ source: filters.source })
  }
  if (filters.statuses?.length) {
    parts.push({ status: { in: filters.statuses } })
  }
  if (filters.csvOnly) {
    parts.push({ csv_imported_at: { not: null } })
  }

  return { AND: parts }
}

export type BookingAnalyticsData = {
  totals: {
    bookingCount: number
    sumGross: number
    sumNet: number
    sumPayout: number
    totalNights: number
  }
  byProperty: Array<{
    propertyId: string
    propertyName: string
    count: number
    sumGross: number
    sumNet: number
  }>
  bySource: Array<{
    source: BookingSource
    count: number
    sumGross: number
  }>
  byMonth: Array<{
    monthKey: string
    label: string
    count: number
    sumGross: number
  }>
}

export async function getBookingAnalytics(
  filters: BookingAnalyticsFilters
): Promise<BookingAnalyticsData> {
  const where = buildBookingAnalyticsWhere(filters)

  const [aggregate, byPropertyRaw, bySourceRaw, nightAndMonthRows] = await Promise.all([
    prisma.booking.aggregate({
      where,
      _count: true,
      _sum: {
        gross_revenue: true,
        net_revenue: true,
        total_payout: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["property_id"],
      where,
      _count: true,
      _sum: { gross_revenue: true, net_revenue: true },
    }),
    prisma.booking.groupBy({
      by: ["source"],
      where,
      _count: true,
      _sum: { gross_revenue: true },
    }),
    prisma.booking.findMany({
      where,
      select: {
        check_in: true,
        check_out: true,
        gross_revenue: true,
      },
    }),
  ])

  const properties = await prisma.property.findMany({
    where: { id: { in: byPropertyRaw.map((p) => p.property_id) } },
    select: { id: true, name: true },
  })
  const nameById = new Map(properties.map((p) => [p.id, p.name]))

  const byProperty = byPropertyRaw
    .map((row) => ({
      propertyId: row.property_id,
      propertyName: nameById.get(row.property_id) ?? "Unknown",
      count: prismaAggregateCount(row._count),
      sumGross: Number(row._sum.gross_revenue ?? 0),
      sumNet: Number(row._sum.net_revenue ?? 0),
    }))
    .sort((a, b) => b.sumGross - a.sumGross)

  const bySource = bySourceRaw
    .map((row) => ({
      source: row.source,
      count: prismaAggregateCount(row._count),
      sumGross: Number(row._sum.gross_revenue ?? 0),
    }))
    .sort((a, b) => b.count - a.count)

  let totalNights = 0
  const monthMap = new Map<string, { count: number; sumGross: number }>()
  for (const b of nightAndMonthRows) {
    totalNights += Math.max(0, differenceInCalendarDays(b.check_out, b.check_in))
    const key = format(b.check_in, "yyyy-MM")
    const prev = monthMap.get(key) ?? { count: 0, sumGross: 0 }
    prev.count += 1
    prev.sumGross += Number(b.gross_revenue ?? 0)
    monthMap.set(key, prev)
  }

  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, v]) => ({
      monthKey,
      label: format(parseISO(`${monthKey}-01`), "MMM yyyy"),
      count: v.count,
      sumGross: v.sumGross,
    }))

  return {
    totals: {
      bookingCount: prismaAggregateCount(aggregate._count),
      sumGross: Number(aggregate._sum.gross_revenue ?? 0),
      sumNet: Number(aggregate._sum.net_revenue ?? 0),
      sumPayout: Number(aggregate._sum.total_payout ?? 0),
      totalNights,
    },
    byProperty,
    bySource,
    byMonth,
  }
}

export async function sanitizePropertyFilter(propertyId: string | null): Promise<string | null> {
  if (!propertyId) return null
  const n = await prisma.property.count({ where: { id: propertyId } })
  return n > 0 ? propertyId : null
}
