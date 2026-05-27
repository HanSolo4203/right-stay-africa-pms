import type { MaintenanceJob, Contractor, Property } from "@prisma/client"
import { parseMaintenanceNotes } from "@/lib/maintenance/job-notes"

type JobWithRelations = MaintenanceJob & {
  property?: Pick<Property, "id" | "name" | "unit_number" | "client_id"> | null
  contractor?: Pick<Contractor, "id" | "name" | "phone" | "trade" | "email"> | null
}

export function maintenanceJobToJson(job: JobWithRelations, extra?: { expenseCreated?: boolean }) {
  return {
    id: job.id,
    propertyId: job.propertyId,
    property: job.property
      ? {
          id: job.property.id,
          name: job.property.name,
          unitNumber: job.property.unit_number,
          clientId: job.property.client_id,
        }
      : null,
    title: job.title,
    description: job.description,
    category: job.category,
    priority: job.priority,
    status: job.status,
    contractorId: job.contractorId,
    contractor: job.contractor
      ? {
          id: job.contractor.id,
          name: job.contractor.name,
          phone: job.contractor.phone,
          trade: job.contractor.trade,
          email: job.contractor.email,
        }
      : null,
    contractorName: job.contractorName,
    contractorPhone: job.contractorPhone,
    reportedAt: job.reportedAt.toISOString(),
    scheduledFor: job.scheduledFor?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    dueBy: job.dueBy?.toISOString() ?? null,
    estimatedCost: job.estimatedCost,
    actualCost: job.actualCost,
    currency: job.currency,
    chargeToOwner: job.chargeToOwner,
    ownerStatementNote: job.ownerStatementNote,
    notes: job.notes,
    noteEntries: parseMaintenanceNotes(job.notes),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    ...extra,
  }
}

export function contractorToJson(
  contractor: Contractor & { _count?: { jobs: number } },
  activeJobCount?: number
) {
  return {
    id: contractor.id,
    name: contractor.name,
    trade: contractor.trade,
    phone: contractor.phone,
    email: contractor.email,
    company: contractor.company,
    notes: contractor.notes,
    isActive: contractor.isActive,
    activeJobCount: activeJobCount ?? contractor._count?.jobs,
    createdAt: contractor.createdAt.toISOString(),
    updatedAt: contractor.updatedAt.toISOString(),
  }
}
