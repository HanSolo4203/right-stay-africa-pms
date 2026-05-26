import { z } from "zod"
import { accountTypeSchema } from "@/lib/validations/client-profile"

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .nullable()
  .optional()

const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .nullable()
  .optional()

export const updateCompanySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required.").optional(),
  tagline: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  email: optionalEmail,
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  statementFooterNote: z.string().max(300).optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  branchCode: z.string().optional().nullable(),
  accountType: accountTypeSchema.optional().nullable(),
})

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>

export const companySettingsFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  tagline: z.string(),
  registrationNumber: z.string(),
  vatNumber: z.string(),
  email: z.union([z.string().email("Enter a valid email address."), z.literal("")]),
  phone: z.string(),
  whatsapp: z.string(),
  address: z.string(),
  website: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  statementFooterNote: z.string().max(300, "Footer note must be 300 characters or fewer."),
  bankName: z.string(),
  accountHolder: z.string(),
  accountNumber: z.string(),
  branchCode: z.string(),
  accountType: accountTypeSchema.optional().nullable(),
})

export type CompanySettingsFormValues = z.infer<typeof companySettingsFormSchema>
