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
  STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_FOOTER_RESERVE,
  STATEMENT_PDF_SAFE_INSET,
} from "./statement-pdf-layout"
import { formatZAR } from "./owner-statement-pdf-format"

const PDF_FAMILY = getOwnerStatementPdfFontFamily()
const FONT = pdfFontRegular(PDF_FAMILY)
const FONT_BOLD = pdfFontBold(PDF_FAMILY)

const C = {
  ink: "#1a1a1a",
  headerBg: "#111c15",
  white: "#ffffff",
  muted: "#666666",
  border: "#e0e0e0",
  accent: "#2d7a4f",
  stripBg: "#f5f7f5",
} as const

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    paddingTop: STATEMENT_PDF_SAFE_INSET,
    paddingBottom: STATEMENT_PDF_FOOTER_RESERVE,
    paddingHorizontal: STATEMENT_PDF_SAFE_INSET,
  },
  headerBand: {
    ...STATEMENT_PDF_BLEED_BLOCK_MARGINS,
    backgroundColor: C.headerBg,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    color: C.white,
  },
  headerSub: {
    fontSize: 11,
    color: "#a8c4b0",
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowBold: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    backgroundColor: C.stripBg,
    paddingHorizontal: 8,
  },
  label: { fontSize: 10, color: C.ink },
  labelMuted: { fontSize: 9, color: C.muted },
  value: { fontFamily: FONT_BOLD, fontSize: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.stripBg,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  colLabel: { width: "34%" },
  colNum: { width: "22%", textAlign: "right" },
  note: { fontSize: 8, color: C.muted, marginTop: 12, lineHeight: 1.4 },
  body: { paddingHorizontal: STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING },
})

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function SummaryRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
}) {
  return (
    <View style={bold ? styles.rowBold : styles.row}>
      <Text style={muted ? styles.labelMuted : styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  const period = formatPeriod(summary.month, summary.year)
  const generated = new Date().toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>{companySettings.companyName}</Text>
          <Text style={styles.headerSub}>Portfolio statement — {period}</Text>
          <Text style={styles.headerSub}>Generated {generated}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Owner payouts</Text>
          <SummaryRow
            label={`Finalised (${summary.finalised.finalisedPropertyCount} of ${summary.totalProperties} properties)`}
            value={formatZAR(summary.finalised.ownerPayouts)}
            bold
          />
          <SummaryRow
            label={`Portfolio preview (${summary.preview.propertiesWithFigures} with figures)`}
            value={formatZAR(summary.preview.ownerPayouts)}
            muted
          />

          <Text style={styles.sectionTitle}>Right Stay income</Text>
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

          <Text style={styles.sectionTitle}>Additional expenses by category</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.colLabel, { fontFamily: FONT_BOLD }]}>Category</Text>
            <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>Finalised</Text>
            <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>Preview</Text>
            <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>RSA income (F)</Text>
          </View>
          {summary.expenseBreakdown.map((row) => (
            <View key={row.category} style={styles.tableRow}>
              <Text style={styles.colLabel}>{row.label}</Text>
              <Text style={styles.colNum}>{formatZAR(row.finalisedCharged)}</Text>
              <Text style={styles.colNum}>{formatZAR(row.previewCharged)}</Text>
              <Text style={styles.colNum}>{formatZAR(row.finalisedRsaIncome)}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Management fees &amp; expense totals</Text>
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
              <Text style={styles.sectionTitle}>Properties (summary)</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.colLabel, { width: "28%", fontFamily: FONT_BOLD }]}>Property</Text>
                <Text style={{ width: "12%", fontFamily: FONT_BOLD, fontSize: 10 }}>Status</Text>
                <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>Owner (F)</Text>
                <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>Owner (P)</Text>
                <Text style={[styles.colNum, { fontFamily: FONT_BOLD }]}>RSA (F)</Text>
              </View>
              {summary.propertyRows.slice(0, 40).map((row) => (
                <View key={row.propertyId} style={styles.tableRow}>
                  <Text style={{ width: "28%", fontSize: 8 }}>{row.propertyName}</Text>
                  <Text style={{ width: "12%", fontSize: 8 }}>{row.status}</Text>
                  <Text style={[styles.colNum, { fontSize: 8 }]}>
                    {row.finalOwnerPayout != null ? formatZAR(row.finalOwnerPayout) : "—"}
                  </Text>
                  <Text style={[styles.colNum, { fontSize: 8 }]}>
                    {row.previewOwnerPayout != null ? formatZAR(row.previewOwnerPayout) : "—"}
                  </Text>
                  <Text style={[styles.colNum, { fontSize: 8 }]}>
                    {row.finalRsaIncome != null ? formatZAR(row.finalRsaIncome) : "—"}
                  </Text>
                </View>
              ))}
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
    </Document>
  )
}
