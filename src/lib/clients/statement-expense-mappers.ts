import type { OwnerStatementManualLineV1 } from "@/lib/owner-statement/types"
import type { StatementExpenseItem } from "@/types/statement"

export type StatementExpenseDto = {
  id: string
  clientId: string
  propertyId: string
  month: number
  year: number
  description: string
  qty: number
  unitPrice: number
  total: number
  createdAt: string
}

export function expensesToManualLines(expenses: StatementExpenseDto[]): OwnerStatementManualLineV1[] {
  return expenses.map((e) => ({
    id: e.id,
    description: e.description,
    quantity: e.qty,
    unitPrice: e.unitPrice,
    addTenPercent: false,
  }))
}

export function statementExpenseItemsToManualLines(
  items: StatementExpenseItem[]
): OwnerStatementManualLineV1[] {
  return items.map((e) => ({
    id: e.id,
    description: e.description,
    quantity: e.qty,
    unitPrice: e.unitPrice,
    addTenPercent: false,
  }))
}

export function sumExpenseTotals(expenses: StatementExpenseDto[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.total, 0) * 100) / 100
}
