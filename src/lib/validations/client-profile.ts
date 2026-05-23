import { z } from "zod"

export const accountTypeSchema = z.enum(["cheque", "savings", "transmission"])

export const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Valid email is required."),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  bankName: z.string().optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  accountType: accountTypeSchema.optional().nullable(),
})
