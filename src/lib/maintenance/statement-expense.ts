import { lineCharge } from "@/lib/owner-statement/compute"
import {
  appendMaintenanceNote,
  maintenanceExpenseRef,
  parseMaintenanceNotes,
} from "@/lib/maintenance/job-notes"
import { prisma } from "@/lib/prisma"

export async function maybeCreateMaintenanceStatementExpense(
  job: {
    id: string
    propertyId: string
    title: string
    ownerStatementNote: string | null
    actualCost: number | null
    chargeToOwner: boolean
    notes: string | null
    completedAt: Date
  },
  property: { client_id: string | null }
): Promise<{ expenseCreated: boolean; expenseId?: string; month?: number; year?: number }> {
  if (!job.chargeToOwner || !job.actualCost || job.actualCost <= 0) {
    return { expenseCreated: false }
  }

  if (!property.client_id) {
    return { expenseCreated: false }
  }

  const ref = maintenanceExpenseRef(job.id)
  const existingFromNotes = parseMaintenanceNotes(job.notes).find((e) => e.expenseId)
  if (existingFromNotes?.expenseId) {
    return { expenseCreated: false }
  }

  const month = job.completedAt.getMonth() + 1
  const year = job.completedAt.getFullYear()
  const baseDescription = (job.ownerStatementNote ?? job.title).trim()
  const description = `${baseDescription} ${ref}`.trim()

  const existing = await prisma.statementExpense.findFirst({
    where: {
      property_id: job.propertyId,
      month,
      year,
      description: { contains: ref },
    },
  })
  if (existing) {
    return { expenseCreated: false, month, year }
  }

  const unitPrice = job.actualCost
  const total = lineCharge(unitPrice, false)

  const expense = await prisma.statementExpense.create({
    data: {
      client_id: property.client_id,
      property_id: job.propertyId,
      month,
      year,
      description,
      qty: 1,
      unit_price: unitPrice,
      total,
      add_ten_percent: false,
      expense_category: "MAINTENANCE",
    },
  })

  return { expenseCreated: true, expenseId: expense.id, month, year }
}

export function notesWithExpense(
  notes: string | null,
  text: string,
  expenseId: string
): string {
  return appendMaintenanceNote(notes, {
    type: "system",
    text,
    expenseId,
  })
}
