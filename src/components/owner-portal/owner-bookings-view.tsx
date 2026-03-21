import { BookingSource, BookingStatus } from "@prisma/client"
import { differenceInCalendarDays, startOfDay } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type BookingRow = {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  source: BookingSource
  status: BookingStatus
}

const sourceLabel: Record<BookingSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  DIRECT: "Direct",
  OTHER: "Other",
}

const statusLabel: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
}

const statusClass: Record<BookingStatus, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-700",
}

function firstNameOnly(guestName: string) {
  const first = guestName.trim().split(/\s+/)[0]
  return first || guestName
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function stayNights(checkIn: string, checkOut: string) {
  const a = startOfDay(new Date(checkIn))
  const b = startOfDay(new Date(checkOut))
  return Math.max(0, differenceInCalendarDays(b, a))
}

/** In-house: today (calendar) ∈ [check_in, check_out) */
function isActiveGuest(booking: BookingRow, todayStart: Date) {
  if (booking.status === BookingStatus.CANCELLED) return false
  const ci = startOfDay(new Date(booking.check_in))
  const co = startOfDay(new Date(booking.check_out))
  const t = todayStart.getTime()
  return t >= ci.getTime() && t < co.getTime()
}

function isCurrentOrUpcoming(booking: BookingRow, todayStart: Date) {
  if (booking.status === BookingStatus.CANCELLED) return false
  if (isActiveGuest(booking, todayStart)) return true
  const ci = startOfDay(new Date(booking.check_in))
  return ci.getTime() > todayStart.getTime()
}

type OwnerBookingsViewProps = {
  bookings: BookingRow[]
}

export function OwnerBookingsView({ bookings }: OwnerBookingsViewProps) {
  const todayStart = startOfDay(new Date())

  const sortedForTable = [...bookings].sort(
    (a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
  )

  const highlighted = bookings
    .filter((b) => isCurrentOrUpcoming(b, todayStart))
    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Current &amp; upcoming</h2>
        {highlighted.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-600">No current or upcoming reservations.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {highlighted.map((booking) => (
              <Card key={booking.id} className="bg-white">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{firstNameOnly(booking.guest_name)}</CardTitle>
                    <Badge className={statusClass[booking.status]}>{statusLabel[booking.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-600">
                  <p>
                    {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                  </p>
                  <p>
                    {stayNights(booking.check_in, booking.check_out)} night
                    {stayNights(booking.check_in, booking.check_out) === 1 ? "" : "s"} · {sourceLabel[booking.source]}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">All bookings</h2>
        {sortedForTable.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-4 text-sm text-slate-600">No bookings recorded yet.</CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sortedForTable.map((booking) => (
                <Card key={booking.id} className="bg-white">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{firstNameOnly(booking.guest_name)}</p>
                      <Badge className={statusClass[booking.status]}>{statusLabel[booking.status]}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {stayNights(booking.check_in, booking.check_out)} nights · {sourceLabel[booking.source]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="hidden bg-white md:block">
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedForTable.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{firstNameOnly(booking.guest_name)}</TableCell>
                        <TableCell>{formatDate(booking.check_in)}</TableCell>
                        <TableCell>{formatDate(booking.check_out)}</TableCell>
                        <TableCell>{stayNights(booking.check_in, booking.check_out)}</TableCell>
                        <TableCell>{sourceLabel[booking.source]}</TableCell>
                        <TableCell>
                          <Badge className={statusClass[booking.status]}>{statusLabel[booking.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}
