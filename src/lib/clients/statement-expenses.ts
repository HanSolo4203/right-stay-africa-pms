import "server-only"

import { prisma } from "@/lib/prisma"
import type { StatementExpenseCategoryValue } from "@/lib/validations/statement-expense"
import type { StatementExpenseDto } from "@/lib/clients/statement-expense-mappers"

export type { StatementExpenseDto } from "@/lib/clients/statement-expense-mappers"
export {
  expensesToManualLines,
  statementExpenseItemsToManualLines,
  sumExpenseTotals,
} from "@/lib/clients/statement-expense-mappers"

function toDto(row: {
  id: string
  client_id: string
  property_id: string
  month: number
  year: number
  description: string
  qty: number
  unit_price: { toString: () => string }
  total: { toString: () => string }
  add_ten_percent: boolean
  expense_category: string | null
  created_at: Date
}): StatementExpenseDto {
  return {
    id: row.id,
    clientId: row.client_id,
    propertyId: row.property_id,
    month: row.month,
    year: row.year,
    description: row.description,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    addTenPercent: row.add_ten_percent,
    expenseCategory: row.expense_category as StatementExpenseCategoryValue | null,
    createdAt: row.created_at.toISOString(),
  }
}

export async function loadStatementExpenses(
  clientId: string,
  propertyId: string,
  month: number,
  year: number
): Promise<StatementExpenseDto[]> {
  const rows = await prisma.statementExpense.findMany({
    where: { client_id: clientId, property_id: propertyId, month, year },
    orderBy: { created_at: "asc" },
  })
  return rows.map(toDto)
}
