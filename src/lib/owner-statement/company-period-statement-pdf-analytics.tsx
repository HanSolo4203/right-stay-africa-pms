import "server-only"

import { Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import type {
  PortfolioPeriodAnalytics,
  PortfolioPayoutSplit,
  PortfolioPropertyOccupancyRow,
  PortfolioTrackAnalytics,
} from "@/lib/clients/portfolio-period-summary"
import { formatZAR } from "./owner-statement-pdf-format"
import { getOwnerStatementPdfFontFamily, pdfFontBold, pdfFontRegular } from "./register-pdf-fonts"
import {
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_FOOTER_RESERVE,
  STATEMENT_PDF_SAFE_INSET,
} from "./statement-pdf-layout"
import {
  STATEMENT_PDF_BRAND,
  StatementPdfBrandedHeader,
} from "./statement-pdf-branded-header"

const FONT = pdfFontRegular(getOwnerStatementPdfFontFamily())
const FONT_BOLD = pdfFontBold(getOwnerStatementPdfFontFamily())

const C = STATEMENT_PDF_BRAND

const styles = {
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    backgroundColor: C.stripBg,
    paddingTop: STATEMENT_PDF_SAFE_INSET,
    paddingBottom: STATEMENT_PDF_FOOTER_RESERVE,
    paddingHorizontal: STATEMENT_PDF_SAFE_INSET,
  } satisfies Style,
  body: {
    paddingHorizontal: STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
    paddingTop: 10,
    gap: 10,
  } satisfies Style,
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 1.2,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginBottom: 6,
    marginTop: 4,
  } satisfies Style,
  trackLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginBottom: 4,
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
  } satisfies Style,
  kpiSub: {
    fontSize: 7,
    color: C.muted,
    marginTop: 2,
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
    paddingHorizontal: 10,
  } satisfies Style,
  panelTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  } satisfies Style,
  stackedBar: {
    flexDirection: "row" as const,
    height: 14,
    borderRadius: 7,
    overflow: "hidden" as const,
    marginBottom: 8,
  } satisfies Style,
  stackedSegment: {
    height: 14,
  } satisfies Style,
  splitLegendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 4,
  } satisfies Style,
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  } satisfies Style,
  legendLabel: {
    fontSize: 8.5,
    flex: 1,
  } satisfies Style,
  legendValue: {
    fontSize: 8.5,
    color: C.muted,
  } satisfies Style,
  compareRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
  } satisfies Style,
  compareLabel: {
    width: 72,
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
    width: 72,
    fontSize: 7.5,
    textAlign: "right" as const,
  } satisfies Style,
  tableWrap: {
    borderWidth: 0.5,
    borderColor: C.border,
  } satisfies Style,
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: "#f5f5f5",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  } satisfies Style,
  tableRow: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  } satisfies Style,
  tableRowAlt: {
    backgroundColor: C.tableAlt,
  } satisfies Style,
  colProperty: { width: "42%", fontSize: 8 } satisfies Style,
  colClient: { width: "28%", fontSize: 7, color: C.muted } satisfies Style,
  colNights: { width: "14%", fontSize: 8, textAlign: "right" as const } satisfies Style,
  colOcc: { width: "16%", fontSize: 8, textAlign: "right" as const } satisfies Style,
  note: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 6,
    lineHeight: 1.35,
    fontStyle: "italic" as const,
  } satisfies Style,
  empty: {
    fontSize: 9,
    color: "#bbbbbb",
    textAlign: "center" as const,
    paddingVertical: 10,
  } satisfies Style,
} as const

function KpiChip({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  )
}

function OccupancyBar({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(0, pct))
  return (
    <View style={[styles.compareTrack, { marginTop: 2 }]}>
      <View
        style={[styles.compareFill, { width: `${width}%`, backgroundColor: C.accentGreen }]}
      />
    </View>
  )
}

function PayoutSplitPanel({
  title,
  split,
}: {
  title: string
  split: PortfolioPayoutSplit
}) {
  if (split.totalDistributed <= 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.empty}>No payout or income figures</Text>
      </View>
    )
  }

  const barMax = Math.max(split.ownerPayouts, split.rsaIncome, 1)

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>

      <View style={styles.stackedBar}>
        {split.ownerPct > 0 ? (
          <View
            style={[
              styles.stackedSegment,
              { width: `${split.ownerPct}%`, backgroundColor: C.payoutGreen },
            ]}
          />
        ) : null}
        {split.rsaPct > 0 ? (
          <View
            style={[
              styles.stackedSegment,
              { width: `${split.rsaPct}%`, backgroundColor: C.accentGreen },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.splitLegendRow}>
        <View style={[styles.legendDot, { backgroundColor: C.payoutGreen }]} />
        <Text style={styles.legendLabel}>Owner payouts</Text>
        <Text wrap={false} style={styles.legendValue}>
          {split.ownerPct.toFixed(1)}% · {formatZAR(split.ownerPayouts)}
        </Text>
      </View>
      <View style={styles.splitLegendRow}>
        <View style={[styles.legendDot, { backgroundColor: C.accentGreen }]} />
        <Text style={styles.legendLabel}>Right Stay income</Text>
        <Text wrap={false} style={styles.legendValue}>
          {split.rsaPct.toFixed(1)}% · {formatZAR(split.rsaIncome)}
        </Text>
      </View>

      <View style={{ marginTop: 8 }}>
        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>Owner payouts</Text>
          <View style={styles.compareTrack}>
            <View
              style={[
                styles.compareFill,
                {
                  width: `${Math.min(100, (split.ownerPayouts / barMax) * 100)}%`,
                  backgroundColor: C.payoutGreen,
                },
              ]}
            />
          </View>
          <Text wrap={false} style={styles.compareAmount}>
            {formatZAR(split.ownerPayouts)}
          </Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>RSA income</Text>
          <View style={styles.compareTrack}>
            <View
              style={[
                styles.compareFill,
                {
                  width: `${Math.min(100, (split.rsaIncome / barMax) * 100)}%`,
                  backgroundColor: C.accentGreen,
                },
              ]}
            />
          </View>
          <Text wrap={false} style={styles.compareAmount}>
            {formatZAR(split.rsaIncome)}
          </Text>
        </View>
      </View>

      <Text style={[styles.note, { marginTop: 8 }]}>
        Combined {formatZAR(split.totalDistributed)} · percentages are share of owner payouts
        plus Right Stay income for this track.
      </Text>
    </View>
  )
}

function PropertyOccupancyTable({
  rows,
  maxRows,
}: {
  rows: PortfolioPropertyOccupancyRow[]
  maxRows: number
}) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>No booked nights in this period</Text>
  }

  const shown = rows.slice(0, maxRows)

  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={[styles.colProperty, { fontFamily: FONT_BOLD }]}>Property</Text>
        <Text style={[styles.colClient, { fontFamily: FONT_BOLD }]}>Client</Text>
        <Text style={[styles.colNights, { fontFamily: FONT_BOLD }]}>Nights</Text>
        <Text style={[styles.colOcc, { fontFamily: FONT_BOLD }]}>Occ.</Text>
      </View>
      {shown.map((row, i) => (
        <View
          key={row.propertyId}
          style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}
        >
          <Text style={styles.colProperty}>{row.propertyName}</Text>
          <Text style={styles.colClient}>{row.clientName}</Text>
          <Text style={styles.colNights}>{row.bookedNights}</Text>
          <Text style={[styles.colOcc, { fontFamily: FONT_BOLD }]}>
            {row.occupancyRatePct.toFixed(1)}%
          </Text>
        </View>
      ))}
      {rows.length > maxRows ? (
        <Text style={styles.note}>…and {rows.length - maxRows} more properties.</Text>
      ) : null}
    </View>
  )
}

function TrackAnalyticsSection({
  label,
  track,
  totalProperties,
}: {
  label: string
  track: PortfolioTrackAnalytics
  totalProperties: number
}) {
  const { occupancy } = track

  return (
    <View>
      <Text style={styles.trackLabel}>{label}</Text>
      <View style={styles.kpiRow}>
        <KpiChip
          label="Portfolio occupancy"
          value={`${occupancy.occupancyRatePct.toFixed(1)}%`}
          sub={`${occupancy.bookedNights} nights · ${totalProperties} properties`}
        />
        <KpiChip
          label="Available nights"
          value={String(occupancy.availableNights)}
          sub={`${occupancy.daysInMonth} days × ${totalProperties} units`}
        />
        <KpiChip
          label="With bookings"
          value={String(occupancy.propertiesWithData)}
          sub="Properties this period"
        />
      </View>
      <OccupancyBar pct={occupancy.occupancyRatePct} />
    </View>
  )
}

export function CompanyPeriodStatementAnalyticsPage({
  periodLabel,
  periodRange,
  companyName,
  analytics,
  totalProperties,
}: {
  periodLabel: string
  periodRange: string
  companyName: string
  analytics: PortfolioPeriodAnalytics
  totalProperties: number
}) {
  const finalOcc = analytics.finalised.occupancy
  const previewOcc = analytics.preview.occupancy

  return (
    <View style={styles.page}>
      <StatementPdfBrandedHeader
        variant="compact"
        statementLabel="PORTFOLIO ANALYTICS"
        periodLabel={periodLabel}
        periodRange={periodRange}
        title={companyName}
        subtitle="Occupancy, payouts, and property breakdown"
      />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Occupancy — property group</Text>
        <View style={styles.panelsRow}>
          <View style={styles.panel}>
            <TrackAnalyticsSection
              label="Finalised"
              track={analytics.finalised}
              totalProperties={totalProperties}
            />
          </View>
          <View style={styles.panel}>
            <TrackAnalyticsSection
              label="Preview"
              track={analytics.preview}
              totalProperties={totalProperties}
            />
          </View>
        </View>

        <Text style={styles.note}>
          Group occupancy = booked nights ÷ ({totalProperties} properties × days in month).
          Finalised uses locked statements; preview uses current booking selections.
        </Text>

        <Text style={styles.sectionTitle}>Owner payouts vs Right Stay income</Text>
        <View style={styles.panelsRow}>
          <PayoutSplitPanel title="Finalised" split={analytics.finalised.payoutSplit} />
          <PayoutSplitPanel title="Preview" split={analytics.preview.payoutSplit} />
        </View>

        <Text style={styles.sectionTitle}>
          Occupancy by property (finalised · {finalOcc.propertiesWithData} with nights)
        </Text>
        <PropertyOccupancyTable rows={analytics.finalised.propertyOccupancy} maxRows={18} />

        {analytics.preview.propertyOccupancy.length > 0 &&
        analytics.preview.propertyOccupancy.length !==
          analytics.finalised.propertyOccupancy.length ? (
          <>
            <Text style={styles.sectionTitle}>
              Occupancy by property (preview · {previewOcc.propertiesWithData} with nights)
            </Text>
            <PropertyOccupancyTable rows={analytics.preview.propertyOccupancy} maxRows={12} />
          </>
        ) : null}
      </View>
    </View>
  )
}
