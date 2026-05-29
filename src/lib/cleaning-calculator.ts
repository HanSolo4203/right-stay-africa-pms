import { addDays, differenceInDays, isBefore, startOfDay } from "date-fns"

export type CleaningTaskInput = {
  bookingId: string
  propertyId: string
  checkIn: Date
  checkOut: Date
  nights: number
}

export type GeneratedCleaningTask = {
  bookingId: string
  propertyId: string
  type: "checkout" | "midstay"
  scheduledDate: Date
  midstayOccurrence: number | null
  status: "scheduled"
}

export function generateCleaningTasks(booking: CleaningTaskInput): GeneratedCleaningTask[] {
  const tasks: GeneratedCleaningTask[] = []
  const checkIn = startOfDay(new Date(booking.checkIn))
  const checkOut = startOfDay(new Date(booking.checkOut))
  const nights = differenceInDays(checkOut, checkIn)

  // Always: checkout clean on checkout date
  tasks.push({
    bookingId: booking.bookingId,
    propertyId: booking.propertyId,
    type: "checkout",
    scheduledDate: checkOut,
    midstayOccurrence: null,
    status: "scheduled",
  })

  // Mid-stay cleans for 7+ night bookings
  // First: day 5 after check-in
  // Then: every 5 nights
  // Stop: if next clean is within 2 days of checkout
  if (nights >= 7) {
    let occurrence = 1
    let cleanDate = addDays(checkIn, 5)

    while (isBefore(cleanDate, checkOut) && differenceInDays(checkOut, cleanDate) > 2) {
      tasks.push({
        bookingId: booking.bookingId,
        propertyId: booking.propertyId,
        type: "midstay",
        scheduledDate: cleanDate,
        midstayOccurrence: occurrence,
        status: "scheduled",
      })
      occurrence++
      cleanDate = addDays(checkIn, 5 * occurrence)
    }
  }

  return tasks
}

