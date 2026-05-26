import { z } from "zod"

const optionalAmount = z.number().finite().optional().nullable()

export const upsertStatementBookingOverrideSchema = z
  .object({
    clientId: z.string().min(1),
    propertyId: z.string().uuid(),
    bookingId: z.string().uuid(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    useAutomaticProRation: z.boolean(),
    note: z.string().trim().optional(),
    accommodation_total: optionalAmount,
    channel_commission: optionalAmount,
    total_management_fee: optionalAmount,
    cleaning_fee: optionalAmount,
    payment_processing_fee: optionalAmount,
    total_payout: optionalAmount,
    discount: optionalAmount,
    extra_charges: optionalAmount,
    upsells: optionalAmount,
    booking_taxes: optionalAmount,
  })
  .superRefine((data, ctx) => {
    if (data.useAutomaticProRation) return
    if (!data.note || data.note.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A note is required when overriding amounts.",
        path: ["note"],
      })
    }
    const gross = data.accommodation_total
    const payout = data.total_payout
    const hasGross = gross != null && Number.isFinite(gross)
    const hasPayout = payout != null && Number.isFinite(payout)
    if (!hasGross && !hasPayout) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter gross income or payout for this month.",
        path: ["total_payout"],
      })
    }
  })

export type UpsertStatementBookingOverrideInput = z.infer<
  typeof upsertStatementBookingOverrideSchema
>
