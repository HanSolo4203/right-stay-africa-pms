import {
  totalBookingFeesFromSnapshotBookings,
  totalsFromSnapshot,
} from "@/lib/owner-statement/statement-preview"
import { isOwnerStatementSnapshotV1 } from "@/lib/owner-statement/types"

export type PropertyStatementRecord = {
  id: string
  month: number
  year: number
  file_name: string | null
  file_url: string | null
  notes: string | null
  created_at: string
  source: "UPLOADED" | "GENERATED"
  status: "DRAFT" | "FINAL" | null
  snapshot: unknown
}

export function statementsHubEditUrl(
  clientId: string | null,
  propertyId: string,
  month: number,
  year: number
): string {
  const client = clientId ?? `property:${propertyId}`
  const params = new URLSearchParams({
    client,
    month: String(month),
    year: String(year),
    property: propertyId,
  })
  return `/clients/statements?${params.toString()}`
}

export function sortGeneratedStatements(statements: PropertyStatementRecord[]): PropertyStatementRecord[] {
  return statements
    .filter((item) => item.source === "GENERATED")
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      if (b.month !== a.month) return b.month - a.month
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
}

export type PropertyFinancialAggregates = {
  statementCount: number
  withSnapshot: number
  ownerPayouts: number
  managementFees: number
  additionalExpenses: number
  bookingFees: number
  grossRevenue: number
}

/** Same snapshot totals as the clients Statements hub / PDF. */
export function aggregatePropertyStatementFinancials(
  generated: PropertyStatementRecord[]
): PropertyFinancialAggregates {
  let ownerPayouts = 0
  let managementFees = 0
  let additionalExpenses = 0
  let bookingFees = 0
  let grossRevenue = 0
  let withSnapshot = 0

  for (const item of generated) {
    if (!isOwnerStatementSnapshotV1(item.snapshot)) continue
    withSnapshot += 1
    const totals = totalsFromSnapshot(item.snapshot)
    bookingFees += totalBookingFeesFromSnapshotBookings(item.snapshot.bookings)
    grossRevenue += totals.grossRevenue
    managementFees += totals.totalManagementFees
    additionalExpenses += totals.additionalExpensesTotal
    ownerPayouts += totals.netToOwner
  }

  return {
    statementCount: generated.length,
    withSnapshot,
    ownerPayouts,
    managementFees,
    additionalExpenses,
    bookingFees,
    grossRevenue,
  }
}

export function statementOwnerPayout(item: PropertyStatementRecord): number | null {
  if (!isOwnerStatementSnapshotV1(item.snapshot)) return null
  return totalsFromSnapshot(item.snapshot).netToOwner
}

export function statementFinancialColumns(item: PropertyStatementRecord): {
  netToOwner: number | null
  grossRevenue: number | null
  managementFees: number | null
  expenses: number | null
} {
  if (!isOwnerStatementSnapshotV1(item.snapshot)) {
    return { netToOwner: null, grossRevenue: null, managementFees: null, expenses: null }
  }
  const totals = totalsFromSnapshot(item.snapshot)
  return {
    netToOwner: totals.netToOwner,
    grossRevenue: totals.grossRevenue,
    managementFees: totals.totalManagementFees,
    expenses: totals.additionalExpensesTotal,
  }
}
