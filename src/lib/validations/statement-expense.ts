import { z } from "zod"

export const createStatementExpenseSchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().min(1, "Description is required."),
  qty: z.number().int().min(1).default(1),
  unitPrice: z.number().positive("Unit price must be positive."),
})

export const listStatementExpensesSchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})
