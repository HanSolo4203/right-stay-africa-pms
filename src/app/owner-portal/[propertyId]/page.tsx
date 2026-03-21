import { BookingStatus } from "@prisma/client"
import { startOfDay } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

type OwnerPropertyOverviewPageProps = {
  params: Promise<{ propertyId: string }>
}

function isGuestActiveToday(checkIn: Date, checkOut: Date, today: Date) {
  const ci = startOfDay(checkIn)
  const co = startOfDay(checkOut)
  const t = startOfDay(today).getTime()
  return t >= ci.getTime() && t < co.getTime()
}

function firstName(guestName: string) {
  const part = guestName.trim().split(/\s+/)[0]
  return part || guestName
}

export default async function OwnerPropertyOverviewPage({ params }: OwnerPropertyOverviewPageProps) {
  const { propertyId } = await params

  const [bookings, statementsUploaded] = await Promise.all([
    prisma.booking.findMany({
      where: { property_id: propertyId },
      select: {
        guest_name: true,
        check_in: true,
        check_out: true,
        status: true,
      },
    }),
    prisma.statement.count({ where: { property_id: propertyId } }),
  ])

  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const totalBookingsThisYear = bookings.filter(
    (b) =>
      b.status !== BookingStatus.CANCELLED && b.check_in < yearEnd && b.check_out > yearStart
  ).length

  const today = new Date()
  const active = bookings.find(
    (b) => b.status !== BookingStatus.CANCELLED && isGuestActiveToday(b.check_in, b.check_out, today)
  )

  const activeLabel = active
    ? `Current guest: ${firstName(active.guest_name)}`
    : "Available"

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-1 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total bookings this year
          </p>
          <p className="text-2xl font-semibold text-slate-900">{totalBookingsThisYear}</p>
          <p className="text-xs text-slate-500">Stays overlapping {year}</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-1 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active booking</p>
          <p className="text-lg font-semibold leading-snug text-slate-900">{activeLabel}</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm sm:col-span-2 lg:col-span-1">
        <CardContent className="space-y-1 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Statements uploaded</p>
          <p className="text-2xl font-semibold text-slate-900">{statementsUploaded}</p>
        </CardContent>
      </Card>
    </div>
  )
}
