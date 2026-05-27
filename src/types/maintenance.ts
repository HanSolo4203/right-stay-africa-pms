import type {
  MaintenanceJobCategory,
  MaintenanceJobPriority,
  MaintenanceJobStatus,
} from "@/lib/validations/maintenance"
import type { MaintenanceNoteEntry } from "@/lib/maintenance/job-notes"

export type MaintenancePropertySummary = {
  id: string
  name: string
  unitNumber: string | null
  clientId?: string | null
}

export type MaintenanceContractorSummary = {
  id: string
  name: string
  phone: string | null
  trade: string | null
  email?: string | null
}

export type MaintenanceJobDto = {
  id: string
  propertyId: string
  property: MaintenancePropertySummary | null
  title: string
  description: string | null
  category: MaintenanceJobCategory
  priority: MaintenanceJobPriority
  status: MaintenanceJobStatus
  contractorId: string | null
  contractor: MaintenanceContractorSummary | null
  contractorName: string | null
  contractorPhone: string | null
  reportedAt: string
  scheduledFor: string | null
  completedAt: string | null
  dueBy: string | null
  estimatedCost: number | null
  actualCost: number | null
  currency: string
  chargeToOwner: boolean
  ownerStatementNote: string | null
  notes: string | null
  noteEntries: MaintenanceNoteEntry[]
  createdAt: string
  updatedAt: string
  expenseCreated?: boolean
}

export type MaintenanceStatsDto = {
  open: number
  inProgress: number
  urgent: number
  completedThisMonth: number
}

export type ContractorDto = {
  id: string
  name: string
  trade: string | null
  phone: string | null
  email: string | null
  company: string | null
  notes: string | null
  isActive: boolean
  activeJobCount?: number
  createdAt: string
  updatedAt: string
}

export type PropertyOption = {
  id: string
  name: string
  unitNumber: string | null
}
