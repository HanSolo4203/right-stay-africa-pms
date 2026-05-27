import { z } from "zod"

export const MAINTENANCE_JOB_CATEGORIES = [
  "plumbing",
  "electrical",
  "appliance",
  "cleaning",
  "painting",
  "carpentry",
  "security",
  "internet",
  "hvac",
  "pest_control",
  "garden",
  "pool",
  "general",
] as const

export type MaintenanceJobCategory = (typeof MAINTENANCE_JOB_CATEGORIES)[number]

export const MAINTENANCE_JOB_PRIORITIES = ["low", "medium", "high", "urgent"] as const

export type MaintenanceJobPriority = (typeof MAINTENANCE_JOB_PRIORITIES)[number]

export const MAINTENANCE_JOB_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const

export type MaintenanceJobStatus = (typeof MAINTENANCE_JOB_STATUSES)[number]

const optionalDate = z
  .union([z.string().datetime(), z.string().date(), z.coerce.date()])
  .optional()
  .nullable()

export const createMaintenanceJobSchema = z.object({
  propertyId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(5000).optional().nullable(),
  category: z.enum(MAINTENANCE_JOB_CATEGORIES),
  priority: z.enum(MAINTENANCE_JOB_PRIORITIES).default("medium"),
  status: z.enum(MAINTENANCE_JOB_STATUSES).optional(),
  contractorId: z.string().cuid().optional().nullable(),
  contractorName: z.string().max(200).optional().nullable(),
  contractorPhone: z.string().max(50).optional().nullable(),
  scheduledFor: optionalDate,
  dueBy: optionalDate,
  estimatedCost: z.number().min(0).optional().nullable(),
  actualCost: z.number().min(0).optional().nullable(),
  currency: z.string().max(8).optional(),
  chargeToOwner: z.boolean().optional(),
  ownerStatementNote: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
})

export const updateMaintenanceJobSchema = createMaintenanceJobSchema
  .partial()
  .extend({
    status: z.enum(MAINTENANCE_JOB_STATUSES).optional(),
    completedAt: optionalDate,
    actualCost: z.number().min(0).optional().nullable(),
    chargeToOwner: z.boolean().optional(),
    ownerStatementNote: z.string().max(500).optional().nullable(),
  })

export const listMaintenanceJobsSchema = z.object({
  status: z.enum(MAINTENANCE_JOB_STATUSES).optional(),
  propertyId: z.string().uuid().optional(),
  priority: z.enum(MAINTENANCE_JOB_PRIORITIES).optional(),
  category: z.enum(MAINTENANCE_JOB_CATEGORIES).optional(),
  search: z.string().max(200).optional(),
})

export const createContractorSchema = z.object({
  name: z.string().min(1).max(200),
  trade: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export const updateContractorSchema = createContractorSchema.partial().extend({
  isActive: z.boolean().optional(),
})
