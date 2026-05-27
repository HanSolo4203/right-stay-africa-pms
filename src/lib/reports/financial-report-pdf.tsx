import "server-only"

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import {
  getOwnerStatementPdfFontFamily,
  pdfFontBold,
  pdfFontRegular,
} from "@/lib/owner-statement/register-pdf-fonts"
import { StatementPdfFooter } from "@/lib/owner-statement/statement-pdf-footer"
import {
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_FOOTER_RESERVE,
  STATEMENT_PDF_SAFE_INSET,
} from "@/lib/owner-statement/statement-pdf-layout"
import { formatZAR } from "@/lib/owner-statement/owner-statement-pdf-format"
import { STATEMENT_PDF_BRAND } from "@/lib/owner-statement/statement-pdf-branded-header"

const PDF_FAMILY = getOwnerStatementPdfFontFamily()
const FONT = pdfFontRegular(PDF_FAMILY)
const FONT_BOLD = pdfFontBold(PDF_FAMILY)
const C = STATEMENT_PDF_BRAND

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    backgroundColor: C.white,
    paddingTop: STATEMENT_PDF_SAFE_INSET,
    paddingBottom: STATEMENT_PDF_FOOTER_RESERVE,
    paddingHorizontal: STATEMENT_PDF_SAFE_INSET,
  },
  landscape: {
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    color: C.ink,
  },
  subtitle: { fontFamily: FONT, fontSize: 10, color: C.muted, marginTop: 4 },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    letterSpacing: 1.2,
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  kpiBox: {
    width: "31%",
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: { fontFamily: FONT, fontSize: 8, color: C.muted },
  kpiValue: { fontFamily: FONT_BOLD, fontSize: 12, marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  },
  colName: { width: "22%", fontSize: 9 },
  colSm: { width: "11%", fontSize: 9, textAlign: "right" },
})

function PdfTableHeader({ cols }: { cols: string[] }) {
  const widths = ["22%", "14%", "9%", "9%", "12%", "12%", "12%", "10%"]
  return (
    <View style={styles.tableHeader}>
      {cols.map((label, i) => (
        <Text
          key={label}
          style={{
            width: widths[i] ?? "10%",
            fontFamily: FONT_BOLD,
            fontSize: 8,
            textAlign: i === 0 ? "left" : "right",
          }}
        >
          {label}
        </Text>
      ))}
    </View>
  )
}

export function FinancialReportPdfDocument({ data }: { data: ReportsSummaryResponse }) {
  const generated = new Date(data.generatedAt).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const kpis = [
    { label: "Revenue managed", value: formatZAR(data.business.totalRevenueManaged) },
    { label: "Management fees", value: formatZAR(data.business.totalManagementFees) },
    { label: "Owner payouts", value: formatZAR(data.business.totalOwnerPayouts) },
    { label: "Bookings", value: String(data.portfolio.totalBookings) },
    { label: "Occupancy", value: `${data.portfolio.occupancyRate.toFixed(1)}%` },
    { label: "Avg fee rate", value: `${data.business.averageManagementFeeRate.toFixed(1)}%` },
  ]

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={[styles.page, styles.landscape]}>
        <Text style={styles.title}>Right Stay Africa</Text>
        <Text style={[styles.title, { fontSize: 14, marginTop: 4 }]}>Financial Report</Text>
        <Text style={styles.subtitle}>
          {data.period.label} · Generated {generated}
        </Text>

        <Text style={styles.sectionTitle}>Business KPIs</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Property breakdown</Text>
        <PdfTableHeader
          cols={[
            "Property",
            "Owner",
            "Bookings",
            "Nights",
            "Revenue",
            "Mgmt fees",
            "Payout",
            "Share",
          ]}
        />
        {data.propertyBreakdown.map((p) => (
          <View key={p.propertyId} style={styles.tableRow}>
            <Text style={styles.colName}>{p.propertyName}</Text>
            <Text style={[styles.colSm, { textAlign: "left" }]}>{p.ownerName ?? "—"}</Text>
            <Text style={styles.colSm}>{p.bookings}</Text>
            <Text style={styles.colSm}>{p.nights}</Text>
            <Text style={styles.colSm}>{formatZAR(p.grossRevenue)}</Text>
            <Text style={styles.colSm}>{formatZAR(p.managementFees)}</Text>
            <Text style={styles.colSm}>{formatZAR(p.ownerPayout)}</Text>
            <Text style={styles.colSm}>{`${p.revenueShare.toFixed(1)}%`}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Platform breakdown</Text>
        <PdfTableHeader cols={["Platform", "Bookings", "Nights", "Revenue", "Mgmt fees", "", "", ""]} />
        {data.platformBreakdown.map((p) => (
          <View key={p.platform} style={styles.tableRow}>
            <Text style={styles.colName}>{p.platform}</Text>
            <Text style={styles.colSm}>{p.bookings}</Text>
            <Text style={styles.colSm}>{p.nights}</Text>
            <Text style={styles.colSm}>{formatZAR(p.revenue)}</Text>
            <Text style={styles.colSm}>{formatZAR(p.managementFees)}</Text>
            <Text style={styles.colSm} />
            <Text style={styles.colSm} />
            <Text style={styles.colSm} />
          </View>
        ))}

        <StatementPdfFooter
          generatedDate={generated}
          backgroundColor={C.white}
          metaSuffix="Confidential · Right Stay Africa"
        />
      </Page>
    </Document>
  )
}
