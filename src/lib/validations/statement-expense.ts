import { z } from "zod"

export const STATEMENT_EXPENSE_CATEGORY_VALUES = [
  "CLEANING",
  "MID_STAY_CLEAN",
  "UTILITIES",
  "MAINTENANCE",
  "OTHER",
] as const

export type StatementExpenseCategoryValue = (typeof STATEMENT_EXPENSE_CATEGORY_VALUES)[number]

export const statementExpenseCategorySchema = z.enum(STATEMENT_EXPENSE_CATEGORY_VALUES)

export const createStatementExpenseSchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().min(1, "Description is required."),
  qty: z.number().int().min(1).default(1),
  unitPrice: z.number().positive("Unit price must be positive."),
  addTenPercent: z.boolean().optional().default(false),
  expenseCategory: statementExpenseCategorySchema.optional().nullable(),
})

export const updateStatementExpenseSchema = z.object({
  description: z.string().min(1, "Description is required.").optional(),
  qty: z.number().int().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  addTenPercent: z.boolean().optional(),
  expenseCategory: statementExpenseCategorySchema.optional().nullable(),
})

export const listStatementExpensesSchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

export const statementAutomaticExpenseLineSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1, "Description is required."),
  qty: z.number().min(0),
  unitPrice: z.number().min(0),
})
