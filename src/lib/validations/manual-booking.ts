import { BookingSource, BookingStatus } from "@prisma/client"
import { differenceInDays } from "date-fns"
import { z } from "zod"

const nonNegAmount = z.number().finite().min(0)

export function parseDateYyyyMmDd(value: string): Date | null {
  const t = value.trim()
  if (!t) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!iso) return null
  const y = Number(iso[1])
  const mo = Number(iso[2]) - 1
  const d = Number(iso[3])
  const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0))
  if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo && dt.getUTCDate() === d) {
    return dt
  }
  return null
}

const dateString = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .refine((s) => parseDateYyyyMmDd(s) != null, "Use YYYY-MM-DD.")

export const createManualBookingSchema = z
  .object({
    propertyId: z.string().uuid(),
    guest_name: z.string().trim().min(1, "Guest name is required."),
    check_in: dateString,
    check_out: dateString,
    num_guests: z.number().int().min(1).max(99).default(1),
    source: z.nativeEnum(BookingSource).default(BookingSource.DIRECT),
    channel_name: z.string().trim().optional().nullable(),
    status: z.nativeEnum(BookingStatus).default(BookingStatus.CONFIRMED),
    confirmation_code: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    total_payout: nonNegAmount.default(0),
    gross_revenue: nonNegAmount.default(0),
    accommodation_total: nonNegAmount.default(0),
    cleaning_fee: nonNegAmount.default(0),
    discount: nonNegAmount.default(0),
    extra_guest_charge: nonNegAmount.default(0),
    extra_charges: nonNegAmount.default(0),
    upsells: nonNegAmount.default(0),
    booking_taxes: nonNegAmount.default(0),
    commission: nonNegAmount.default(0),
    commission_tax: nonNegAmount.default(0),
    payment_processing_fee: nonNegAmount.default(0),
    total_management_fee: nonNegAmount.default(0),
    net_revenue: nonNegAmount.default(0),
  })
  .transform((data) => ({
    ...data,
    check_in: parseDateYyyyMmDd(data.check_in)!,
    check_out: parseDateYyyyMmDd(data.check_out)!,
    channel_name: data.channel_name?.trim() ? data.channel_name.trim() : null,
    confirmation_code: data.confirmation_code?.trim() ? data.confirmation_code.trim() : null,
    notes: data.notes?.trim() ? data.notes.trim() : null,
  }))
  .refine((data) => data.check_out.getTime() > data.check_in.getTime(), {
    message: "Check-out must be after check-in.",
    path: ["check_out"],
  })

export type CreateManualBookingInput = z.infer<typeof createManualBookingSchema>

/** Raw form/API payload before date parsing (check_in / check_out as YYYY-MM-DD strings). */
export type CreateManualBookingFormInput = z.input<typeof createManualBookingSchema>

export function nightlyRateFromStay(
  accommodationTotal: number,
  checkIn: Date,
  checkOut: Date
): number {
  const nights = differenceInDays(checkOut, checkIn)
  if (nights > 0 && accommodationTotal > 0) {
    return Math.round((accommodationTotal / nights) * 100) / 100
  }
  return 0
}
