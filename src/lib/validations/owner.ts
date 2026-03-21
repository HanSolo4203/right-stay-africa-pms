import { z } from "zod"

export const ownerSchema = z.object({
  full_name: z.string().min(1, "Full name is required."),
  phone: z.string().min(1, "Phone is required."),
  email: z.email("A valid email is required."),
  id_number: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  branch_code: z.string().optional(),
  notes: z.string().optional(),
})

export type OwnerFormValues = z.infer<typeof ownerSchema>
