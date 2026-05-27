import "server-only"

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { PortfolioPeriodSummary } from "@/lib/clients/portfolio-period-summary"
import type { CompanySettingsPdf } from "@/lib/company-settings"
import {
  getOwnerStatementPdfFontFamily,
  pdfFontBold,
  pdfFontRegular,
} from "./register-pdf-fonts"
import { StatementPdfFooter } from "./statement-pdf-footer"
import {
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_FOOTER_RESERVE,
  STATEMENT_PDF_SAFE_INSET,
} from "./statement-pdf-layout"
import { CompanyPeriodStatementAnalyticsPage } from "./company-period-statement-pdf-analytics"
import { formatZAR, formatZARTable } from "./owner-statement-pdf-format"
import {
  STATEMENT_PDF_BRAND,
  StatementPdfBrandedHeader,
  StatementPdfKpiCard,
  StatementPdfKpiStrip,
  formatStatementMonthYear,
  formatStatementPeriodRange,
} from "./statement-pdf-branded-header"

const PDF_FAMILY = getOwnerStatementPdfFontFamily()
const FONT = pdfFontRegular(PDF_FAMILY)
const FONT_BOLD = pdfFontBold(PDF_FAMILY)

const C = STATEMENT_PDF_BRAND

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 11,
    color: C.ink,
    backgroundColor: C.white,
    paddingTop: STATEMENT_PDF_SAFE_INSET,
    paddingBottom: STATEMENT_PDF_FOOTER_RESERVE,
    paddingHorizontal: STATEMENT_PDF_SAFE_INSET,
  },
  sectionPad: {
    paddingVertical: 18,
    paddingHorizontal: STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  },
  sectionHeading: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  },
  rowBold: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
    backgroundColor: C.totalBg,
    borderWidth: 0.5,
    borderColor: C.totalBorder,
    borderRadius: 4,
  },
  rowMuted: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
    opacity: 0.85,
  },
  label: { fontFamily: FONT, fontSize: 11, color: "#666666" },
  labelMuted: { fontFamily: FONT, fontSize: 10, color: C.muted },
  value: { fontFamily: FONT_BOLD, fontSize: 11, color: C.ink },
  valueAccent: { fontFamily: FONT_BOLD, fontSize: 11, color: C.payoutGreen },
  tableWrap: {
    borderWidth: 0.5,
    borderColor: C.border,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  },
  tableRowAlt: {
    backgroundColor: C.tableAlt,
  },
  colLabel: { width: "34%", fontSize: 10 },
  colNum: { width: "22%", fontSize: 10, textAlign: "right" },
  note: {
    fontFamily: FONT,
    fontSize: 8,
    color: C.muted,
    marginTop: 14,
    lineHeight: 1.45,
    fontStyle: "italic",
  },
})

function SummaryRow({
  label,
  value,
  bold,
  muted,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
  accent?: boolean
}) {
  const rowStyle = bold ? styles.rowBold : muted ? styles.rowMuted : styles.row
  return (
    <View style={rowStyle}>
      <Text style={muted ? styles.labelMuted : styles.label}>{label}</Text>
      <Text style={accent ? styles.valueAccent : styles.value}>{value}</Text>
    </View>
  )
}

export function CompanyPeriodStatementPdfDocument({
  summary,
  companySettings,
}: {
  summary: PortfolioPeriodSummary
  companySettings: CompanySettingsPdf
}) {
  const { month, year } = summary
  const periodLabel = formatStatementMonthYear(month, year)
  const periodRange = formatStatementPeriodRange(month, year)
  const generated = new Date().toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const finalOcc = summary.analytics.finalised.occupancy

  return (
    <Document
      title={`Portfolio statement — ${periodLabel}`}
      author="Right Stay Africa"
    >
      <Page size="A4" style={styles.page}>
        <StatementPdfBrandedHeader
          statementLabel="PORTFOLIO STATEMENT"
          periodLabel={periodLabel}
          periodRange={periodRange}
          title={companySettings.companyName}
          subtitle={`${summary.totalProperties} properties · ${summary.finalised.finalisedPropertyCount} finalised`}
          metaLeftLabel="Generated"
          metaLeftValue={generated}
        />

        <StatementPdfKpiStrip>
          <StatementPdfKpiCard
            label="Owner payouts"
            value={formatZARTable(summary.finalised.ownerPayouts)}
            sub={`${summary.finalised.finalisedPropertyCount} finalised properties`}
            accent
          />
          <StatementPdfKpiCard
            label="Right Stay income"
            value={formatZARTable(summary.finalised.rightStayIncome.total)}
            sub="Finalised track"
          />
          <StatementPdfKpiCard
            label="Portfolio occupancy"
            value={`${finalOcc.occupancyRatePct.toFixed(1)}%`}
            sub={`${finalOcc.bookedNights} booked nights`}
          />
          <StatementPdfKpiCard
            label="Preview payouts"
            value={formatZARTable(summary.preview.ownerPayouts)}
            sub={`${summary.preview.propertiesWithFigures} with figures`}
          />
        </StatementPdfKpiStrip>

        <View style={styles.sectionPad}>
          <Text style={styles.sectionHeading}>Owner payouts</Text>
          <SummaryRow
            label={`Finalised (${summary.finalised.finalisedPropertyCount} of ${summary.totalProperties} properties)`}
            value={formatZAR(summary.finalised.ownerPayouts)}
            bold
            accent
          />
          <SummaryRow
            label={`Portfolio preview (${summary.preview.propertiesWithFigures} with figures)`}
            value={formatZAR(summary.preview.ownerPayouts)}
            muted
          />

          <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Right Stay income</Text>
          <SummaryRow
            label="Management fees (commission) — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.commission)}
          />
          <SummaryRow
            label="Cleaning fees — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.cleaning)}
          />
          <SummaryRow
            label="Welcome pack — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.welcomePack)}
          />
          <SummaryRow
            label="Mid-stay clean — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.midStayClean)}
          />
          <SummaryRow
            label="Service fees (utilities, maintenance, +10%) — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.serviceFees)}
          />
          <SummaryRow
            label="Total Right Stay income — finalised"
            value={formatZAR(summary.finalised.rightStayIncome.total)}
            bold
          />
          <SummaryRow
            label="Total Right Stay income — preview"
            value={formatZAR(summary.preview.rightStayIncome.total)}
            muted
          />

          <Text style={[styles.sectionHeading, { marginTop: 20 }]}>
            Additional expenses by category
          </Text>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colLabel, { fontFamily: FONT_BOLD, fontSize: 7 }]}>Category</Text>
              <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>Finalised</Text>
              <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>Preview</Text>
              <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>RSA income (F)</Text>
            </View>
            {summary.expenseBreakdown.map((row, i) => (
              <View
                key={row.category}
                style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}
              >
                <Text style={styles.colLabel}>{row.label}</Text>
                <Text style={styles.colNum}>{formatZAR(row.finalisedCharged)}</Text>
                <Text style={styles.colNum}>{formatZAR(row.previewCharged)}</Text>
                <Text style={styles.colNum}>{formatZAR(row.finalisedRsaIncome)}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionHeading, { marginTop: 20 }]}>
            Management fees &amp; expense totals
          </Text>
          <SummaryRow
            label="Management fees — finalised"
            value={formatZAR(summary.finalised.managementFees)}
          />
          <SummaryRow
            label="Additional expenses charged — finalised"
            value={formatZAR(summary.finalised.additionalExpenses)}
          />
          <SummaryRow
            label="Management fees — preview"
            value={formatZAR(summary.preview.managementFees)}
            muted
          />
          <SummaryRow
            label="Additional expenses charged — preview"
            value={formatZAR(summary.preview.additionalExpenses)}
            muted
          />

          {summary.propertyRows.length > 0 ? (
            <>
              <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Properties (summary)</Text>
              <View style={styles.tableWrap}>
                <View style={styles.tableHeader}>
                  <Text style={{ width: "28%", fontFamily: FONT_BOLD, fontSize: 7 }}>Property</Text>
                  <Text style={{ width: "12%", fontFamily: FONT_BOLD, fontSize: 7 }}>Status</Text>
                  <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>Owner (F)</Text>
                  <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>Owner (P)</Text>
                  <Text style={[styles.colNum, { fontFamily: FONT_BOLD, fontSize: 7 }]}>RSA (F)</Text>
                </View>
                {summary.propertyRows.slice(0, 40).map((row, i) => (
                  <View
                    key={row.propertyId}
                    style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}
                  >
                    <Text style={{ width: "28%", fontSize: 9 }}>{row.propertyName}</Text>
                    <Text style={{ width: "12%", fontSize: 9 }}>{row.status}</Text>
                    <Text style={[styles.colNum, { fontSize: 9 }]}>
                      {row.finalOwnerPayout != null ? formatZAR(row.finalOwnerPayout) : "—"}
                    </Text>
                    <Text style={[styles.colNum, { fontSize: 9 }]}>
                      {row.previewOwnerPayout != null ? formatZAR(row.previewOwnerPayout) : "—"}
                    </Text>
                    <Text style={[styles.colNum, { fontSize: 9 }]}>
                      {row.finalRsaIncome != null ? formatZAR(row.finalRsaIncome) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
              {summary.propertyRows.length > 40 ? (
                <Text style={styles.note}>
                  …and {summary.propertyRows.length - 40} more properties.
                </Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.note}>
            Finalised figures use locked owner statements. Preview includes draft and not-started
            properties using current booking and expense selections. Pass-through expense income
            (cleaning, welcome pack, mid-stay) is the full charged amount; service fee income is
            the 10% markup on utilities, maintenance, and other lines marked +10%.
          </Text>
        </View>

        <StatementPdfFooter
          generatedDate={generated}
          backgroundColor={C.headerBg}
          companySettings={companySettings}
          metaSuffix="Portfolio summary for the selected period"
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <CompanyPeriodStatementAnalyticsPage
          periodLabel={periodLabel}
          periodRange={periodRange}
          companyName={companySettings.companyName}
          analytics={summary.analytics}
          totalProperties={summary.totalProperties}
        />
        <StatementPdfFooter
          generatedDate={generated}
          backgroundColor={C.headerBg}
          companySettings={companySettings}
          metaSuffix="Portfolio analytics for the selected period"
        />
      </Page>
    </Document>
  )
}
