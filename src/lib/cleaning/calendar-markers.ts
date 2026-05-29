export type CalendarCleaningMarker = {
  id: string
  bookingId: string
  type: "checkout" | "midstay"
  scheduledDate: string
  status: "scheduled" | "completed" | "skipped"
  guestName: string | null
}

export function cleansForDay(
  markers: CalendarCleaningMarker[],
  day: Date,
): CalendarCleaningMarker[] {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, "0")
  const d = String(day.getDate()).padStart(2, "0")
  const key = `${y}-${m}-${d}`
  return markers.filter((c) => {
    const scheduled = new Date(c.scheduledDate)
    const sy = scheduled.getFullYear()
    const sm = String(scheduled.getMonth() + 1).padStart(2, "0")
    const sd = String(scheduled.getDate()).padStart(2, "0")
    return `${sy}-${sm}-${sd}` === key
  })
}
