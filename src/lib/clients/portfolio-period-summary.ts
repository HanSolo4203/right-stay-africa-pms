import { statementExpenseItemsToManualLines } from "@/lib/clients/statement-expense-mappers"
import {
  coerceOwnerStatementManualLine,
  computeExpenses,
} from "@/lib/owner-statement/compute"
import { totalsFromSnapshot } from "@/lib/owner-statement/statement-preview"
import type {
  OwnerStatementExpenseComputed,
  OwnerStatementSnapshotV1,
} from "@/lib/owner-statement/types"

export type PortfolioOccupancySummary = {
  daysInMonth: number
  totalProperties: number
  propertiesWithData: number
  bookedNights: number
  availableNights: number
  /** 0–100 for display */
  occupancyRatePct: number
}

export type PortfolioPropertyOccupancyRow = {
  propertyId: string
  propertyName: string
  clientName: string
  bookedNights: number
  /** 0–100 for this property in the period */
  occupancyRatePct: number
}

export type PortfolioPayoutSplit = {
  ownerPayouts: number
  rsaIncome: number
  totalDistributed: number
  ownerPct: number
  rsaPct: number
}

export type PortfolioTrackAnalytics = {
  occupancy: PortfolioOccupancySummary
  payoutSplit: PortfolioPayoutSplit
  propertyOccupancy: PortfolioPropertyOccupancyRow[]
}

export type PortfolioPeriodAnalytics = {
  finalised: PortfolioTrackAnalytics
  preview: PortfolioTrackAnalytics
}
import { isOwnerStatementSnapshotV1 } from "@/lib/owner-statement/types"
import type { ClientStatementSummary, PropertyStatement } from "@/types/statement"

export type PortfolioExpenseCategory =
  | "cleaning"
  | "welcome_pack"
  | "mid_stay_clean"
  | "electricity"
  | "maintenance"
  | "other"

export const PORTFOLIO_EXPENSE_CATEGORY_LABELS: Record<PortfolioExpenseCategory, string> = {
  cleaning: "Cleaning fees",
  welcome_pack: "Welcome pack",
  mid_stay_clean: "Mid-stay clean",
  electricity: "Electricity / utilities",
  maintenance: "Maintenance",
  other: "Other expenses",
}

const ALL_CATEGORIES: PortfolioExpenseCategory[] = [
  "cleaning",
  "welcome_pack",
  "mid_stay_clean",
  "electricity",
  "maintenance",
  "other",
]

export type PortfolioExpenseCategoryRow = {
  category: PortfolioExpenseCategory
  label: string
  finalisedCharged: number
  previewCharged: number
  finalisedRsaIncome: number
  previewRsaIncome: number
}

export type RightStayIncomeBreakdown = {
  commission: number
  cleaning: number
  welcomePack: number
  midStayClean: number
  serviceFees: number
  total: number
}

export type PortfolioTrackTotals = {
  ownerPayouts: number
  managementFees: number
  additionalExpenses: number
  rightStayIncome: RightStayIncomeBreakdown
  propertiesWithFigures: number
}

export type PortfolioPeriodSummary = {
  month: number
  year: number
  totalProperties: number
  finalised: PortfolioTrackTotals & { finalisedPropertyCount: number }
  preview: PortfolioTrackTotals
  expenseBreakdown: PortfolioExpenseCategoryRow[]
  propertyRows: PortfolioPropertyRow[]
  analytics: PortfolioPeriodAnalytics
}

export type PortfolioPropertyRow = {
  clientName: string
  propertyName: string
  propertyId: string
  status: "none" | "DRAFT" | "FINAL"
  finalOwnerPayout: number | null
  previewOwnerPayout: number | null
  finalRsaIncome: number | null
  previewRsaIncome: number | null
  finalBookedNights: number | null
  previewBookedNights: number | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function portfolioDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

export function bookedNightsFromSnapshot(snap: OwnerStatementSnapshotV1): number {
  return snap.bookings.reduce(
    (sum, b) => sum + (Number.isFinite(b.num_nights) ? b.num_nights : 0),
    0
  )
}

export function propertyOccupancyRatePct(bookedNights: number, daysInMonth: number): number {
  if (daysInMonth <= 0) return 0
  return round2((bookedNights / daysInMonth) * 100)
}

export function computePortfolioOccupancySummary(input: {
  bookedNights: number
  totalProperties: number
  daysInMonth: number
  propertiesWithData: number
}): PortfolioOccupancySummary {
  const availableNights = input.totalProperties * input.daysInMonth
  const occupancyRatePct =
    availableNights > 0 ? round2((input.bookedNights / availableNights) * 100) : 0
  return {
    daysInMonth: input.daysInMonth,
    totalProperties: input.totalProperties,
    propertiesWithData: input.propertiesWithData,
    bookedNights: input.bookedNights,
    availableNights,
    occupancyRatePct,
  }
}

export function computePortfolioPayoutSplit(
  ownerPayouts: number,
  rsaIncome: number
): PortfolioPayoutSplit {
  const owner = round2(ownerPayouts)
  const rsa = round2(rsaIncome)
  const totalDistributed = round2(owner + rsa)
  const ownerPct = totalDistributed > 0 ? round2((owner / totalDistributed) * 100) : 0
  const rsaPct = totalDistributed > 0 ? round2((rsa / totalDistributed) * 100) : 0
  return { ownerPayouts: owner, rsaIncome: rsa, totalDistributed, ownerPct, rsaPct }
}

function buildPropertyOccupancyRows(
  rows: PortfolioPropertyRow[],
  track: "final" | "preview",
  daysInMonth: number
): PortfolioPropertyOccupancyRow[] {
  return rows
    .map((row) => {
      const nights = track === "final" ? row.finalBookedNights : row.previewBookedNights
      if (nights == null || nights <= 0) return null
      return {
        propertyId: row.propertyId,
        propertyName: row.propertyName,
        clientName: row.clientName,
        bookedNights: nights,
        occupancyRatePct: propertyOccupancyRatePct(nights, daysInMonth),
      }
    })
    .filter((r): r is PortfolioPropertyOccupancyRow => r != null)
    .sort((a, b) => b.occupancyRatePct - a.occupancyRatePct)
}

function buildPortfolioAnalytics(
  propertyRows: PortfolioPropertyRow[],
  totalProperties: number,
  month: number,
  year: number,
  finalised: PortfolioTrackTotals & { finalisedPropertyCount: number },
  preview: PortfolioTrackTotals
): PortfolioPeriodAnalytics {
  const daysInMonth = portfolioDaysInMonth(month, year)

  const finalBookedNights = propertyRows.reduce(
    (sum, row) => sum + (row.finalBookedNights ?? 0),
    0
  )
  const previewBookedNights = propertyRows.reduce(
    (sum, row) => sum + (row.previewBookedNights ?? 0),
    0
  )
  const finalPropertiesWithData = propertyRows.filter(
    (row) => row.finalBookedNights != null && row.finalBookedNights > 0
  ).length
  const previewPropertiesWithData = propertyRows.filter(
    (row) => row.previewBookedNights != null && row.previewBookedNights > 0
  ).length

  const finalisedOccupancy = computePortfolioOccupancySummary({
    bookedNights: finalBookedNights,
    totalProperties,
    daysInMonth,
    propertiesWithData: finalPropertiesWithData,
  })
  const previewOccupancy = computePortfolioOccupancySummary({
    bookedNights: previewBookedNights,
    totalProperties,
    daysInMonth,
    propertiesWithData: previewPropertiesWithData,
  })

  return {
    finalised: {
      occupancy: finalisedOccupancy,
      payoutSplit: computePortfolioPayoutSplit(
        finalised.ownerPayouts,
        finalised.rightStayIncome.total
      ),
      propertyOccupancy: buildPropertyOccupancyRows(propertyRows, "final", daysInMonth),
    },
    preview: {
      occupancy: previewOccupancy,
      payoutSplit: computePortfolioPayoutSplit(
        preview.ownerPayouts,
        preview.rightStayIncome.total
      ),
      propertyOccupancy: buildPropertyOccupancyRows(propertyRows, "preview", daysInMonth),
    },
  }
}

function emptyRightStayIncome(): RightStayIncomeBreakdown {
  return {
    commission: 0,
    cleaning: 0,
    welcomePack: 0,
    midStayClean: 0,
    serviceFees: 0,
    total: 0,
  }
}

function emptyCharged(): Record<PortfolioExpenseCategory, number> {
  return {
    cleaning: 0,
    welcome_pack: 0,
    mid_stay_clean: 0,
    electricity: 0,
    maintenance: 0,
    other: 0,
  }
}

function emptyCategoryIncome(): Record<PortfolioExpenseCategory, number> {
  return { ...emptyCharged() }
}

export function expenseServiceFeeAmount(line: OwnerStatementExpenseComputed): number {
  if (!line.addTenPercent) return 0
  return round2(line.chargedAmount - line.baseAmount)
}

export function classifyExpenseLine(
  line: OwnerStatementExpenseComputed,
  expenseCategory?: string | null
): PortfolioExpenseCategory {
  const key = line.key
  const label = line.label.toLowerCase()

  if (key.startsWith("m:cleaning:") || expenseCategory === "CLEANING") return "cleaning"
  if (key.startsWith("m:welcome-pack:")) return "welcome_pack"
  if (expenseCategory === "MID_STAY_CLEAN" || /mid[\s-]?stay/i.test(line.label)) {
    return "mid_stay_clean"
  }
  if (expenseCategory === "UTILITIES" || /\belectric/i.test(label) || /\butilities?\b/i.test(label)) {
    return "electricity"
  }
  if (expenseCategory === "MAINTENANCE" || /\bmaintenance\b/i.test(label) || /\brepair/i.test(label)) {
    return "maintenance"
  }
  return "other"
}

export function rightStayIncomeFromExpenseLine(
  line: OwnerStatementExpenseComputed,
  category: PortfolioExpenseCategory
): number {
  switch (category) {
    case "cleaning":
    case "welcome_pack":
    case "mid_stay_clean":
      return line.chargedAmount
    case "electricity":
    case "maintenance":
    case "other":
      return expenseServiceFeeAmount(line)
    default:
      return expenseServiceFeeAmount(line)
  }
}

function sumRightStayIncome(parts: Omit<RightStayIncomeBreakdown, "total">): RightStayIncomeBreakdown {
  const total = round2(
    parts.commission + parts.cleaning + parts.welcomePack + parts.midStayClean + parts.serviceFees
  )
  return { ...parts, total }
}

function expenseLinesFromSnapshot(snap: OwnerStatementSnapshotV1): OwnerStatementExpenseComputed[] {
  const manual = snap.manualLines.map((l) => coerceOwnerStatementManualLine(l))
  const { lines } = computeExpenses(manual, snap.receiptLines ?? [])
  return lines
}

function expenseLinesFromProperty(property: PropertyStatement): OwnerStatementExpenseComputed[] {
  const manual = statementExpenseItemsToManualLines([
    ...property.automaticExpenses,
    ...property.manualExpenses,
  ])
  const { lines } = computeExpenses(manual, [])
  return lines
}

function manualCategoryMeta(property: PropertyStatement): Map<string, string | null | undefined> {
  const map = new Map<string, string | null | undefined>()
  for (const e of property.manualExpenses) {
    map.set(e.id, e.expenseCategory ?? null)
  }
  return map
}

function snapshotManualCategoryMeta(snap: OwnerStatementSnapshotV1): Map<string, string | null | undefined> {
  const map = new Map<string, string | null | undefined>()
  for (const line of snap.manualLines) {
    if (line.id.startsWith("cleaning:") || line.id.startsWith("welcome-pack:")) continue
    map.set(line.id, line.expenseCategory ?? null)
  }
  return map
}

type LineAccumulation = {
  charged: Record<PortfolioExpenseCategory, number>
  rsaByCategory: Record<PortfolioExpenseCategory, number>
  income: Omit<RightStayIncomeBreakdown, "total">
}

function emptyLineAccumulation(): LineAccumulation {
  return {
    charged: emptyCharged(),
    rsaByCategory: emptyCategoryIncome(),
    income: { commission: 0, cleaning: 0, welcomePack: 0, midStayClean: 0, serviceFees: 0 },
  }
}

function accumulateLines(
  lines: OwnerStatementExpenseComputed[],
  categoryMeta: Map<string, string | null | undefined>,
  acc: LineAccumulation
) {
  for (const line of lines) {
    const manualId = line.key.startsWith("m:") ? line.key.slice(2) : null
    const category = classifyExpenseLine(line, manualId ? categoryMeta.get(manualId) : null)
    const income = rightStayIncomeFromExpenseLine(line, category)

    acc.charged[category] = round2(acc.charged[category] + line.chargedAmount)
    acc.rsaByCategory[category] = round2(acc.rsaByCategory[category] + income)

    switch (category) {
      case "cleaning":
        acc.income.cleaning = round2(acc.income.cleaning + income)
        break
      case "welcome_pack":
        acc.income.welcomePack = round2(acc.income.welcomePack + income)
        break
      case "mid_stay_clean":
        acc.income.midStayClean = round2(acc.income.midStayClean + income)
        break
      case "electricity":
      case "maintenance":
      case "other":
        acc.income.serviceFees = round2(acc.income.serviceFees + income)
        break
      default:
        break
    }
  }
}

function propertyHasPreviewFigures(property: PropertyStatement): boolean {
  return (
    property.lines.length > 0 ||
    property.existingStatementId != null ||
    property.manualExpenses.length > 0 ||
    property.automaticExpenses.length > 0
  )
}

function computePropertyRsaIncome(
  managementFees: number,
  lineAcc: LineAccumulation
): number {
  return sumRightStayIncome({
    commission: managementFees,
    cleaning: lineAcc.income.cleaning,
    welcomePack: lineAcc.income.welcomePack,
    midStayClean: lineAcc.income.midStayClean,
    serviceFees: lineAcc.income.serviceFees,
  }).total
}

export function aggregatePortfolioFromClients(
  clients: ClientStatementSummary[],
  month: number,
  year: number
): PortfolioPeriodSummary {
  let totalProperties = 0
  let finalisedPropertyCount = 0

  let finalOwnerPayouts = 0
  let finalManagementFees = 0
  let finalAdditionalExpenses = 0
  let finalPropertiesWithFigures = 0
  const finalLineAcc = emptyLineAccumulation()

  let previewOwnerPayouts = 0
  let previewManagementFees = 0
  let previewAdditionalExpenses = 0
  let previewPropertiesWithFigures = 0
  const previewLineAcc = emptyLineAccumulation()

  const propertyRows: PortfolioPropertyRow[] = []

  for (const client of clients) {
    for (const property of client.properties) {
      totalProperties += 1
      const status = property.existingStatementStatus ?? "none"
      const snap =
        property.statementSnapshot != null && isOwnerStatementSnapshotV1(property.statementSnapshot)
          ? property.statementSnapshot
          : null

      let finalOwnerPayout: number | null = null
      let previewOwnerPayout: number | null = null
      let finalRsa: number | null = null
      let previewRsa: number | null = null
      let finalBookedNights: number | null = null
      let previewBookedNights: number | null = null

      if (status === "FINAL" && snap != null) {
        finalisedPropertyCount += 1
        const totals = totalsFromSnapshot(snap)
        const lines = expenseLinesFromSnapshot(snap)
        const lineAcc = emptyLineAccumulation()
        accumulateLines(lines, snapshotManualCategoryMeta(snap), lineAcc)

        finalOwnerPayouts = round2(finalOwnerPayouts + totals.netToOwner)
        finalManagementFees = round2(finalManagementFees + totals.totalManagementFees)
        finalAdditionalExpenses = round2(finalAdditionalExpenses + totals.additionalExpensesTotal)
        finalPropertiesWithFigures += 1

        for (const cat of ALL_CATEGORIES) {
          finalLineAcc.charged[cat] = round2(finalLineAcc.charged[cat] + lineAcc.charged[cat])
          finalLineAcc.rsaByCategory[cat] = round2(finalLineAcc.rsaByCategory[cat] + lineAcc.rsaByCategory[cat])
        }
        finalLineAcc.income.commission = round2(
          finalLineAcc.income.commission + totals.totalManagementFees
        )
        finalLineAcc.income.cleaning = round2(finalLineAcc.income.cleaning + lineAcc.income.cleaning)
        finalLineAcc.income.welcomePack = round2(finalLineAcc.income.welcomePack + lineAcc.income.welcomePack)
        finalLineAcc.income.midStayClean = round2(finalLineAcc.income.midStayClean + lineAcc.income.midStayClean)
        finalLineAcc.income.serviceFees = round2(finalLineAcc.income.serviceFees + lineAcc.income.serviceFees)

        finalOwnerPayout = totals.netToOwner
        finalRsa = computePropertyRsaIncome(totals.totalManagementFees, lineAcc)
        finalBookedNights = bookedNightsFromSnapshot(snap)
      }

      if (propertyHasPreviewFigures(property)) {
        const lines = expenseLinesFromProperty(property)
        const lineAcc = emptyLineAccumulation()
        accumulateLines(lines, manualCategoryMeta(property), lineAcc)

        previewOwnerPayouts = round2(previewOwnerPayouts + property.totals.netToOwner)
        previewManagementFees = round2(previewManagementFees + property.totals.totalManagementFees)
        previewAdditionalExpenses = round2(
          previewAdditionalExpenses + property.totals.additionalExpensesTotal
        )
        previewPropertiesWithFigures += 1

        for (const cat of ALL_CATEGORIES) {
          previewLineAcc.charged[cat] = round2(previewLineAcc.charged[cat] + lineAcc.charged[cat])
          previewLineAcc.rsaByCategory[cat] = round2(
            previewLineAcc.rsaByCategory[cat] + lineAcc.rsaByCategory[cat]
          )
        }
        previewLineAcc.income.commission = round2(
          previewLineAcc.income.commission + property.totals.totalManagementFees
        )
        previewLineAcc.income.cleaning = round2(previewLineAcc.income.cleaning + lineAcc.income.cleaning)
        previewLineAcc.income.welcomePack = round2(previewLineAcc.income.welcomePack + lineAcc.income.welcomePack)
        previewLineAcc.income.midStayClean = round2(previewLineAcc.income.midStayClean + lineAcc.income.midStayClean)
        previewLineAcc.income.serviceFees = round2(previewLineAcc.income.serviceFees + lineAcc.income.serviceFees)

        previewOwnerPayout = property.totals.netToOwner
        previewRsa = computePropertyRsaIncome(property.totals.totalManagementFees, lineAcc)
        previewBookedNights = property.totals.totalNights
      }

      propertyRows.push({
        clientName: client.clientName,
        propertyName: property.propertyName,
        propertyId: property.propertyId,
        status,
        finalOwnerPayout,
        previewOwnerPayout,
        finalRsaIncome: finalRsa,
        previewRsaIncome: previewRsa,
        finalBookedNights,
        previewBookedNights,
      })
    }
  }

  const expenseBreakdown = ALL_CATEGORIES.map((category) => ({
    category,
    label: PORTFOLIO_EXPENSE_CATEGORY_LABELS[category],
    finalisedCharged: finalLineAcc.charged[category],
    previewCharged: previewLineAcc.charged[category],
    finalisedRsaIncome: finalLineAcc.rsaByCategory[category],
    previewRsaIncome: previewLineAcc.rsaByCategory[category],
  }))

  const finalisedTotals = {
    ownerPayouts: finalOwnerPayouts,
    managementFees: finalManagementFees,
    additionalExpenses: finalAdditionalExpenses,
    rightStayIncome: sumRightStayIncome({
      commission: finalLineAcc.income.commission,
      cleaning: finalLineAcc.income.cleaning,
      welcomePack: finalLineAcc.income.welcomePack,
      midStayClean: finalLineAcc.income.midStayClean,
      serviceFees: finalLineAcc.income.serviceFees,
    }),
    propertiesWithFigures: finalPropertiesWithFigures,
    finalisedPropertyCount,
  }
  const previewTotals = {
    ownerPayouts: previewOwnerPayouts,
    managementFees: previewManagementFees,
    additionalExpenses: previewAdditionalExpenses,
    rightStayIncome: sumRightStayIncome({
      commission: previewLineAcc.income.commission,
      cleaning: previewLineAcc.income.cleaning,
      welcomePack: previewLineAcc.income.welcomePack,
      midStayClean: previewLineAcc.income.midStayClean,
      serviceFees: previewLineAcc.income.serviceFees,
    }),
    propertiesWithFigures: previewPropertiesWithFigures,
  }

  return {
    month,
    year,
    totalProperties,
    finalised: finalisedTotals,
    preview: previewTotals,
    expenseBreakdown,
    propertyRows,
    analytics: buildPortfolioAnalytics(
      propertyRows,
      totalProperties,
      month,
      year,
      finalisedTotals,
      previewTotals
    ),
  }
}
