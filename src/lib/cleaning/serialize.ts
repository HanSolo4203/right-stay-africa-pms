import type { Prisma } from "@prisma/client"

export type CleaningStatus = "scheduled" | "completed" | "skipped"
export type CleaningType = "checkout" | "midstay" | "manual"

const taskInclude = {
  property: { select: { id: true, name: true, unit_number: true, address: true } },
  booking: {
    select: {
      id: true,
      guest_name: true,
      check_in: true,
      check_out: true,
      channel_name: true,
      confirmation_code: true,
      cleaning_schedule_locked: true,
    },
  },
} satisfies Prisma.CleaningTaskInclude

export type CleaningTaskWithRelations = Prisma.CleaningTaskGetPayload<{
  include: typeof taskInclude
}>

export function bookingNights(checkIn: Date, checkOut: Date): number {
  return Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
  )
}

export function serializeCleaningTask(row: CleaningTaskWithRelations) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    propertyId: row.property_id,
    type: row.type as CleaningType,
    scheduledDate: row.scheduled_for,
    midstayOccurrence: row.midstay_occurrence,
    status: row.status as CleaningStatus,
    completedAt: row.completed_at,
    notes: row.notes,
    cleanerName: row.cleaner_name,
    isManualOverride: row.is_manual_override,
    property: {
      id: row.property.id,
      name: row.property.name,
      unitNumber: row.property.unit_number,
      address: row.property.address,
    },
    booking: row.booking
      ? {
          id: row.booking.id,
          guestName: row.booking.guest_name,
          checkIn: row.booking.check_in,
          checkOut: row.booking.check_out,
          nights: bookingNights(row.booking.check_in, row.booking.check_out),
          platform: row.booking.channel_name,
          confirmationCode: row.booking.confirmation_code,
          cleaningScheduleLocked: row.booking.cleaning_schedule_locked,
        }
      : null,
  }
}

export const cleaningTaskInclude = taskInclude
