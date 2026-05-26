import "server-only"

import { Image, Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import {
  channelDonutColor,
  channelSharePercent,
  type StatementAnalyticsSummary,
  type StatementChannelSlice,
  type StatementIncomeExpenseTotals,
} from "./owner-statement-pdf-analytics"
import { formatZAR } from "./owner-statement-pdf-format"
import { getOwnerStatementPdfFontFamily, pdfFontBold, pdfFontRegular } from "./register-pdf-fonts"
import {
  STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_HEADER_TOP_PADDING,
  STATEMENT_PDF_SAFE_INSET,
} from "./statement-pdf-layout"
import { getStatementLogoDataUri } from "./statement-pdf-logo"

const FONT = pdfFontRegular(getOwnerStatementPdfFontFamily())
const FONT_BOLD = pdfFontBold(getOwnerStatementPdfFontFamily())

const C = {
  pageBg: "#f5f7f5",
  headerBg: "#111c15",
  headerMuted: "#607a68",
  headerSoft: "#7a9b85",
  headerLine: "#2a4a35",
  white: "#ffffff",
  muted: "#888888",
  ink: "#1a1a1a",
  border: "#e0e0e0",
  income: "#166534",
  expense: "#94a3b8",
  propertyDeduction: "#d97706",
  owner: "#1a5c35",
  accentGreen: "#2d7a4f",
  payoutCardBg: "#f2faf5",
} as const

const chartStyles = {
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    backgroundColor: C.pageBg,
  } satisfies Style,
  bleedBlock: STATEMENT_PDF_BLEED_BLOCK_MARGINS satisfies Style,
  bleedHeaderWrap: {
    ...STATEMENT_PDF_BLEED_BLOCK_MARGINS,
    backgroundColor: C.headerBg,
    paddingTop: STATEMENT_PDF_HEADER_TOP_PADDING,
  } satisfies Style,
  header: {
    backgroundColor: C.headerBg,
    paddingVertical: 14,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  } satisfies Style,
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  } satisfies Style,
  logo: {
    width: 140,
    height: 34,
    objectFit: "contain" as const,
    objectPosition: "left" as const,
  } satisfies Style,
  headerTitleBlock: {
    alignItems: "flex-end" as const,
  } satisfies Style,
  headerLabel: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 1.2,
    color: C.headerMuted,
    textTransform: "uppercase" as const,
  } satisfies Style,
  headerPeriod: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: C.white,
    marginTop: 1,
  } satisfies Style,
  headerSub: {
    fontFamily: FONT,
    fontSize: 8.5,
    color: C.headerSoft,
    marginTop: 1,
  } satisfies Style,
  headerProperty: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.headerLine,
  } satisfies Style,
  headerPropertyName: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: C.white,
  } satisfies Style,
  headerPropertyBuilding: {
    fontFamily: FONT,
    fontSize: 9.5,
    color: C.headerSoft,
    marginTop: 2,
  } satisfies Style,
  body: {
    paddingHorizontal: STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: STATEMENT_PDF_SAFE_INSET + 4,
    gap: 8,
  } satisfies Style,
  kpiRow: {
    flexDirection: "row" as const,
    gap: 8,
  } satisfies Style,
  kpiCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  } satisfies Style,
  kpiLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 6.5,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  } satisfies Style,
  kpiValue: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: C.ink,
    lineHeight: 1.15,
  } satisfies Style,
  kpiSub: {
    fontFamily: FONT,
    fontSize: 7,
    color: C.muted,
    marginTop: 1,
  } satisfies Style,
  panelsRow: {
    flexDirection: "row" as const,
    gap: 10,
    alignItems: "flex-start" as const,
  } satisfies Style,
  panel: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  } satisfies Style,
  panelTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  } satisfies Style,
  channelBar: {
    flexDirection: "row" as const,
    height: 12,
    borderRadius: 6,
    overflow: "hidden" as const,
    marginBottom: 6,
  } satisfies Style,
  channelSegment: {
    height: 12,
  } satisfies Style,
  legendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 3,
  } satisfies Style,
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  } satisfies Style,
  legendLabel: {
    fontSize: 8,
    color: C.ink,
    flex: 1,
  } satisfies Style,
  legendValue: {
    fontSize: 8,
    color: C.muted,
  } satisfies Style,
  channelTotal: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  } satisfies Style,
  channelTotalLabel: {
    fontSize: 8,
    color: C.muted,
  } satisfies Style,
  channelTotalValue: {
    fontSize: 8,
    color: C.ink,
  } satisfies Style,
  sectionLabel: {
    fontSize: 7,
    letterSpacing: 0.6,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginTop: 4,
    marginBottom: 3,
  } satisfies Style,
  calcRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 2,
    gap: 6,
  } satisfies Style,
  calcLabel: {
    fontSize: 7.5,
    color: C.muted,
    flex: 1,
    lineHeight: 1.25,
  } satisfies Style,
  calcValue: {
    fontSize: 7.5,
    color: C.ink,
    textAlign: "right" as const,
  } satisfies Style,
  calcValuePayout: {
    fontSize: 8,
    color: C.owner,
    textAlign: "right" as const,
  } satisfies Style,
  compareChart: {
    gap: 4,
    marginBottom: 2,
  } satisfies Style,
  compareRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  } satisfies Style,
  compareLabel: {
    width: 68,
    fontSize: 7.5,
    color: C.muted,
  } satisfies Style,
  compareTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#eef1f0",
    borderRadius: 4,
    overflow: "hidden" as const,
  } satisfies Style,
  compareFill: {
    height: 8,
    borderRadius: 4,
  } satisfies Style,
  compareAmount: {
    width: 68,
    fontSize: 7.5,
    color: C.ink,
    textAlign: "right" as const,
  } satisfies Style,
  payoutTotalRow: {
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: C.payoutCardBg,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.accentGreen,
  } satisfies Style,
  empty: {
    fontSize: 9,
    color: "#bbbbbb",
    textAlign: "center" as const,
    paddingVertical: 12,
  } satisfies Style,
} as const

function CalcLine({
  label,
  value,
  deduction,
  payout,
}: {
  label: string
  value: string
  deduction?: boolean
  payout?: boolean
}) {
  return (
    <View style={chartStyles.calcRow}>
      <Text style={chartStyles.calcLabel}>{label}</Text>
      <Text
        wrap={false}
        style={[
          payout ? chartStyles.calcValuePayout : chartStyles.calcValue,
          {
            fontFamily: payout ? FONT_BOLD : undefined,
            color: deduction ? C.expense : payout ? C.owner : C.ink,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

function KpiChip({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={chartStyles.kpiCard}>
      <Text style={chartStyles.kpiLabel}>{label}</Text>
      <Text style={chartStyles.kpiValue}>{value}</Text>
      <Text style={chartStyles.kpiSub}>{sub}</Text>
    </View>
  )
}

function AnalyticsHeader({
  periodLabel,
  periodRange,
  propertyName,
  propertyBuildingLine,
}: {
  periodLabel: string
  periodRange: string
  propertyName: string
  propertyBuildingLine: string | null
}) {
  return (
    <View style={chartStyles.bleedHeaderWrap} wrap={false}>
      <View style={chartStyles.header}>
        <View style={chartStyles.headerRow}>
          <Image src={getStatementLogoDataUri()} style={chartStyles.logo} />
          <View style={chartStyles.headerTitleBlock}>
            <Text style={chartStyles.headerLabel}>Property Analytics</Text>
            <Text style={chartStyles.headerPeriod}>{periodLabel}</Text>
            <Text style={chartStyles.headerSub}>{periodRange}</Text>
          </View>
        </View>
        <View style={chartStyles.headerProperty}>
          <Text style={chartStyles.headerPropertyName}>{propertyName}</Text>
          {propertyBuildingLine ? (
            <Text style={chartStyles.headerPropertyBuilding}>{propertyBuildingLine}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function ChannelBreakdown({ slices }: { slices: StatementChannelSlice[] }) {
  const total = slices.reduce((s, x) => s + x.gross, 0)
  if (total <= 0) {
    return <Text style={chartStyles.empty}>No channel revenue</Text>
  }

  return (
    <View>
      <View style={chartStyles.channelBar}>
        {slices.map((slice, i) => {
          const pct = (slice.gross / total) * 100
          if (pct <= 0) return null
          return (
            <View
              key={slice.name}
              style={[
                chartStyles.channelSegment,
                {
                  width: `${pct}%`,
                  backgroundColor: channelDonutColor(slice.name, i),
                },
              ]}
            />
          )
        })}
      </View>

      {slices.map((slice, i) => {
        const pct = channelSharePercent(slice.gross, total)
        return (
          <View key={slice.name} style={chartStyles.legendRow}>
            <View
              style={[chartStyles.legendDot, { backgroundColor: channelDonutColor(slice.name, i) }]}
            />
            <Text style={chartStyles.legendLabel}>{slice.name}</Text>
            <Text wrap={false} style={chartStyles.legendValue}>
              {pct.toFixed(1)}% · {formatZAR(slice.gross)}
            </Text>
          </View>
        )
      })}

      <View style={chartStyles.channelTotal}>
        <Text style={chartStyles.channelTotalLabel}>Total gross</Text>
        <Text wrap={false} style={[chartStyles.channelTotalValue, { fontFamily: FONT_BOLD }]}>
          {formatZAR(total)}
        </Text>
      </View>
    </View>
  )
}

function IncomeCompareBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <View style={chartStyles.compareRow}>
      <Text style={chartStyles.compareLabel}>{label}</Text>
      <View style={chartStyles.compareTrack}>
        <View
          style={[chartStyles.compareFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text wrap={false} style={chartStyles.compareAmount}>
        {formatZAR(value)}
      </Text>
    </View>
  )
}

function IncomeExpensePanel({ totals }: { totals: StatementIncomeExpenseTotals }) {
  const propertyDeductions = totals.propertyDeductions
  const barMax = Math.max(totals.income, totals.expenses, propertyDeductions, 1)

  if (totals.income === 0 && totals.expenses === 0 && propertyDeductions === 0) {
    return <Text style={chartStyles.empty}>No income or expenses</Text>
  }

  const showAdditional = totals.additionalExpenses > 0
  const showMgmt = totals.managementFees > 0
  const showPropertyDeductions = propertyDeductions > 0

  return (
    <View>
      <View style={chartStyles.compareChart}>
        <IncomeCompareBar label="Income" value={totals.income} max={barMax} color={C.income} />
        <IncomeCompareBar label="OTA expenses" value={totals.expenses} max={barMax} color={C.expense} />
        {showPropertyDeductions ? (
          <IncomeCompareBar
            label="Mgmt & additional"
            value={propertyDeductions}
            max={barMax}
            color={C.propertyDeduction}
          />
        ) : null}
      </View>

      <Text style={chartStyles.sectionLabel}>Owner payout</Text>
      <CalcLine label="Gross booking income" value={formatZAR(totals.income)} />
      <CalcLine label="Less OTA expenses" value={`(${formatZAR(totals.expenses)})`} deduction />
      {showMgmt ? (
        <CalcLine
          label="Less management fees"
          value={`(${formatZAR(totals.managementFees)})`}
          deduction
        />
      ) : null}
      {showAdditional ? (
        <CalcLine
          label="Less additional expenses"
          value={`(${formatZAR(totals.additionalExpenses)})`}
          deduction
        />
      ) : null}
      <View style={chartStyles.payoutTotalRow}>
        <CalcLine label="Owner payout" value={formatZAR(totals.ownerPayout)} payout />
      </View>
      <Text style={[chartStyles.calcLabel, { marginTop: 3 }]}>
        {totals.ownerPayoutPctOfIncome.toFixed(1)}% of gross · matches Financial Summary
      </Text>
    </View>
  )
}

export function OwnerStatementPdfAnalyticsPage({
  channelSlices,
  incomeExpense,
  summary,
  periodLabel,
  periodRange,
  propertyName,
  propertyBuildingLine,
}: {
  channelSlices: StatementChannelSlice[]
  incomeExpense: StatementIncomeExpenseTotals
  summary: StatementAnalyticsSummary
  periodLabel: string
  periodRange: string
  propertyName: string
  propertyBuildingLine: string | null
}) {
  return (
    <View style={chartStyles.page}>
      <AnalyticsHeader
        periodLabel={periodLabel}
        periodRange={periodRange}
        propertyName={propertyName}
        propertyBuildingLine={propertyBuildingLine}
      />

      <View style={chartStyles.body}>
        <View style={chartStyles.kpiRow}>
          <KpiChip
            label="Bookings"
            value={String(summary.bookingCount)}
            sub="This period"
          />
          <KpiChip
            label="Nights"
            value={String(summary.bookedNights)}
            sub={`of ${summary.daysInMonth} available`}
          />
          <KpiChip
            label="Occupancy"
            value={`${summary.occupancyRate.toFixed(1)}%`}
            sub="Calendar"
          />
          <KpiChip
            label="Avg / night"
            value={formatZAR(summary.avgGrossPerNight)}
            sub="Gross revenue"
          />
        </View>

        <View style={chartStyles.panelsRow}>
          <View style={chartStyles.panel}>
            <Text style={chartStyles.panelTitle}>Gross revenue by channel</Text>
            <ChannelBreakdown slices={channelSlices} />
          </View>

          <View style={chartStyles.panel}>
            <Text style={chartStyles.panelTitle}>Income vs expenses</Text>
            <IncomeExpensePanel totals={incomeExpense} />
          </View>
        </View>
      </View>
    </View>
  )
}
