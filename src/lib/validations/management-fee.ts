import { z } from "zod"

export const managementFeeTypeSchema = z.enum([
  "percentage",
  "fixed_monthly",
  "fixed_per_booking",
])

export const updateManagementFeeSchema = z.object({
  propertyId: z.string().uuid(),
  feeType: managementFeeTypeSchema,
  rate: z.number().min(0, "Rate cannot be negative."),
  welcomePackFee: z.number().min(0, "Welcome pack fee cannot be negative.").optional(),
})

export const listManagementFeesSchema = z.object({
  clientId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})
