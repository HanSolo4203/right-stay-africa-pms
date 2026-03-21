import { z } from "zod"

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  phone: z.string().min(1, "Contact phone is required."),
})

export const infoGuideSchema = z.object({
  wifi_name: z.string().optional(),
  wifi_password: z.string().optional(),
  parking_instructions: z.string().optional(),
  access_code: z.string().optional(),
  lockbox_code: z.string().optional(),
  electricity_notes: z.string().optional(),
  emergency_contacts: z.array(emergencyContactSchema).max(6, "Maximum 6 emergency contacts."),
  notes: z.string().optional(),
})

export type InfoGuideFormValues = z.infer<typeof infoGuideSchema>
