import "server-only"

import type { ReactNode } from "react"
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { getDaysInMonth } from "date-fns"
import { computeExpenses } from "./compute"

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}
import {
  getOwnerStatementPdfFontFamily,
  pdfFontBold,
  pdfFontRegular,
} from "./register-pdf-fonts"
import type { OwnerStatementExpenseComputed, OwnerStatementSnapshotBookingV1, OwnerStatementSnapshotV1 } from "./types"

const PDF_FAMILY = getOwnerStatementPdfFontFamily()
const FONT = pdfFontRegular(PDF_FAMILY)
const FONT_BOLD = pdfFontBold(PDF_FAMILY)

const C = {
  ink: "#1a1a1a",
  headerBg: "#111c15",
  headerMuted: "#607a68",
  headerSoft: "#7a9b85",
  headerLine: "#2a4a35",
  white: "#ffffff",
  stripBg: "#f5f7f5",
  border: "#e0e0e0",
  borderSoft: "#eeeeee",
  muted: "#888888",
  faint: "#aaaaaa",
  zero: "#bbbbbb",
  dash: "#cccccc",
  deduction: "#999999",
  tableAlt: "#fafafa",
  totalBg: "#f0f7f2",
  totalBorder: "#c5dac9",
  accentGreen: "#2d7a4f",
  payoutGreen: "#1a5c35",
  payoutCardBg: "#f2faf5",
} as const

/** Guest column narrower so numeric columns fit compact amounts on one line. */
const BOOKING_COL_WIDTHS = [
  "14%",
  "8.8%",
  "8.8%",
  "7.2%",
  "8.8%",
  "7.2%",
  "8.8%",
  "9.2%",
  "8.8%",
  "8.8%",
  "9.6%",
] as const

const EXPENSE_COL_WIDTHS = ["45%", "10%", "15%", "15%", "15%"] as const

import {
  buildStatementChannelSlices,
  computeStatementAnalyticsSummary,
  computeStatementIncomeExpense,
} from "./owner-statement-pdf-analytics"
import { OwnerStatementPdfAnalyticsPage } from "./owner-statement-pdf-charts"
import {
  STATEMENT_PDF_FOOTER_RESERVE,
  StatementPdfFooter,
} from "./statement-pdf-footer"
import {
  STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_HEADER_TOP_PADDING,
  STATEMENT_PDF_SAFE_INSET,
} from "./statement-pdf-layout"
import type { CompanySettingsPdf } from "@/lib/company-settings"
import { formatPropertyBuildingLine } from "./owner-statement-pdf-property"
import { chunkStatementBookings } from "./statement-pdf-pagination"
import { getStatementLogoDataUri } from "./statement-pdf-logo"
import {
  formatZAR,
  formatZARDeduction,
  formatZARTable,
  formatZARTableDeduction,
} from "./owner-statement-pdf-format"

export { formatZAR } from "./owner-statement-pdf-format"

function formatMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString("en-ZA", { month: "long" })
}

function formatMonthYear(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function formatPeriodDate(d: Date): string {
  return `${d.getDate()} ${d.toLocaleDateString("en-ZA", { month: "long" })} ${d.getFullYear()}`
}

function formatPeriodRange(month: number, year: number): string {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return `${formatPeriodDate(start)} – ${formatPeriodDate(end)}`
}

function formatStayDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return formatPeriodDate(d)
}

/** Shorter stay line on page 1 so guest rows stay single-line. */
function formatStayDateCompact(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function sumBookings(rows: OwnerStatementSnapshotBookingV1[]) {
  return rows.reduce(
    (acc, r) => {
      acc.channelCommission += r.channel_commission
      acc.managementFee += r.total_management_fee
      acc.processingFee += r.payment_processing_fee
      return acc
    },
    { channelCommission: 0, managementFee: 0, processingFee: 0 }
  )
}

function expenseServiceFee(line: OwnerStatementExpenseComputed): number | null {
  if (!line.addTenPercent) return null
  return Math.round((line.chargedAmount - line.baseAmount) * 100) / 100
}

function normaliseBooking(b: Partial<OwnerStatementSnapshotBookingV1>): OwnerStatementSnapshotBookingV1 {
  const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0)
  const checkIn = (b.check_in as string) ?? ""
  const checkOut = (b.check_out as string) ?? ""
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const numNights =
    b.num_nights != null && Number.isFinite(b.num_nights)
      ? b.num_nights
      : Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
  return {
    id: b.id ?? "",
    guest_name: b.guest_name ?? "",
    check_in: checkIn,
    check_out: checkOut,
    num_nights: numNights,
    channel_label: b.channel_label ?? "",
    accommodation_total: n(b.accommodation_total),
    discount: n(b.discount),
    extra_guest_charge: n(b.extra_guest_charge),
    cleaning_fee: n(b.cleaning_fee),
    extra_charges: n(b.extra_charges),
    upsells: n(b.upsells),
    booking_taxes: n(b.booking_taxes),
    channel_commission: n(b.channel_commission),
    total_management_fee: n(b.total_management_fee),
    payment_processing_fee: n(b.payment_processing_fee),
    total_payout: n(b.total_payout),
  }
}

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 11,
    color: C.ink,
    backgroundColor: C.white,
    paddingTop: STATEMENT_PDF_SAFE_INSET,
    paddingLeft: STATEMENT_PDF_SAFE_INSET,
    paddingRight: STATEMENT_PDF_SAFE_INSET,
    paddingBottom: STATEMENT_PDF_FOOTER_RESERVE,
  },
  bleedBlock: STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  bleedHeaderWrap: {
    ...STATEMENT_PDF_BLEED_BLOCK_MARGINS,
    backgroundColor: C.headerBg,
    paddingTop: STATEMENT_PDF_HEADER_TOP_PADDING,
  },
  header: {
    backgroundColor: C.headerBg,
    paddingVertical: 22,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  },
  continuationHeader: {
    backgroundColor: C.headerBg,
    paddingVertical: 12,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  continuationTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: C.white,
    maxWidth: "62%",
  },
  continuationMeta: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.headerSoft,
    textAlign: "right",
    maxWidth: "36%",
  },
  headerRow1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: {
    width: 200,
    height: 48,
    objectFit: "contain",
    objectPosition: "left",
  },
  periodBlock: {
    alignItems: "flex-end",
  },
  periodLabel: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.headerMuted,
    textTransform: "uppercase",
  },
  periodMonth: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    color: C.white,
    marginTop: 2,
  },
  periodRange: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.headerSoft,
    marginTop: 2,
  },
  headerRow2: {
    marginTop: 16,
  },
  propertyName: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: C.white,
  },
  propertyUnit: {
    fontFamily: FONT,
    fontSize: 11,
    color: "#8aab94",
    fontWeight: 400,
    marginTop: 2,
    marginBottom: 2,
  },
  propertyAddress: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.headerSoft,
    marginTop: 3,
  },
  headerRow3: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.headerLine,
  },
  ownerLabel: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.headerMuted,
    textTransform: "uppercase",
  },
  ownerName: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: C.white,
    marginTop: 2,
  },
  zarNote: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.headerMuted,
  },
  kpiStrip: {
    backgroundColor: C.stripBg,
    paddingVertical: 14,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  kpiCardAccent: {
    backgroundColor: C.payoutCardBg,
    borderColor: C.accentGreen,
  },
  kpiLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  kpiValue: {
    fontFamily: FONT_BOLD,
    fontSize: 17,
    color: C.ink,
    lineHeight: 1.2,
  },
  kpiValueAccent: {
    color: C.payoutGreen,
  },
  kpiSub: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.muted,
    marginTop: 3,
  },
  occupancyTrack: {
    width: "100%",
    height: 3,
    backgroundColor: C.border,
    marginTop: 5,
  },
  occupancyFill: {
    height: 3,
    backgroundColor: C.accentGreen,
  },
  sectionPad: {
    paddingVertical: 18,
    paddingHorizontal: STATEMENT_PDF_CONTENT_HORIZONTAL_PADDING,
  },
  sectionPadFinancial: {
    paddingTop: 18,
    paddingBottom: STATEMENT_PDF_SAFE_INSET + 12,
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
  tableBorder: {
    borderWidth: 0.5,
    borderColor: C.border,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowAlt: {
    backgroundColor: C.tableAlt,
  },
  tableHeaderRow: {
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableTotalRow: {
    backgroundColor: C.totalBg,
    borderTopWidth: 0.5,
    borderTopColor: C.totalBorder,
  },
  headerCell: {
    fontFamily: FONT_BOLD,
    fontSize: 7,
    letterSpacing: 0.5,
    color: C.muted,
    textTransform: "uppercase",
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  dataCell: {
    fontFamily: FONT,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: C.borderSoft,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  },
  dataCellMoney: {
    fontFamily: FONT,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: C.borderSoft,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
  },
  dataCellLast: {
    borderRightWidth: 0,
  },
  guestName: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: C.ink,
  },
  guestMeta: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.muted,
    marginTop: 2,
  },
  moneyCell: {
    fontFamily: FONT,
    fontSize: 8,
    textAlign: "right",
  },
  financialStack: {
    gap: 22,
  },
  financialBlock: {
    width: "100%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderSoft,
    fontFamily: FONT,
    fontSize: 11,
    color: "#666666",
  },
  summaryPayoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 11,
    borderTopWidth: 1.5,
    borderTopColor: C.headerBg,
    borderBottomWidth: 0,
  },
  summaryPayoutLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: C.ink,
  },
  summaryPayoutValue: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: C.payoutGreen,
  },
  discountNote: {
    fontFamily: FONT,
    fontSize: 8,
    color: C.faint,
    marginTop: 10,
  },
  prorationLine: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#b45309",
    fontStyle: "italic",
    marginTop: 2,
  },
  prorationFootnote: {
    fontFamily: FONT,
    fontSize: 8,
    fontStyle: "italic",
    color: "#aaaaaa",
    marginTop: 8,
  },
  /** First page only — balanced with compact table so 4 booking rows still fit. */
  headerFirstPage: {
    paddingTop: 22,
    paddingBottom: 18,
  },
  logoFirstPage: {
    width: 176,
    height: 42,
  },
  periodMonthFirstPage: {
    fontSize: 18,
    marginTop: 3,
  },
  periodRangeFirstPage: {
    marginTop: 4,
  },
  headerRow2FirstPage: {
    marginTop: 14,
  },
  propertyNameFirstPage: {
    fontSize: 14,
    lineHeight: 1.25,
  },
  propertyAddressFirstPage: {
    fontSize: 9.5,
    marginTop: 5,
    lineHeight: 1.35,
  },
  headerRow3FirstPage: {
    marginTop: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  ownerLabelFirstPage: {
    marginTop: 0,
  },
  ownerNameFirstPage: {
    fontSize: 12,
    marginTop: 4,
  },
  zarNoteFirstPage: {
    marginBottom: 2,
  },
  kpiStripFirstPage: {
    paddingVertical: 8,
    gap: 6,
  },
  kpiCardFirstPage: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  kpiLabelFirstPage: {
    fontSize: 7,
    marginBottom: 2,
    letterSpacing: 0.6,
  },
  kpiValueFirstPage: {
    fontSize: 13,
  },
  kpiSubFirstPage: {
    fontSize: 7.5,
    marginTop: 1,
  },
  occupancyTrackFirstPage: {
    marginTop: 3,
    height: 2,
  },
  occupancyFillFirstPage: {
    height: 2,
  },
  sectionPadFirstPage: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionHeadingFirstPage: {
    marginBottom: 5,
  },
  headerCellFirstPage: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 6.5,
  },
  dataCellFirstPage: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  dataCellMoneyFirstPage: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  guestNameFirstPage: {
    fontSize: 9.5,
  },
  guestMetaFirstPage: {
    fontSize: 7.5,
    marginTop: 0,
  },
  moneyCellFirstPage: {
    fontSize: 7,
  },
  emptyExpense: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.faint,
    textAlign: "center",
    paddingVertical: 12,
  },
})

export type OwnerStatementPdfMeta = {
  propertyName: string
  propertyAddressLine: string
  propertyBuildingName?: string | null
  propertyUnitNumber?: string | null
  ownerName: string | null
  isFinal: boolean
}

type MoneyCellProps = {
  amount: number
  asDeduction?: boolean
  bold?: boolean
}

function MoneyCellText({ amount, asDeduction, bold, compact }: MoneyCellProps & { compact?: boolean }) {
  const isZero = amount === 0
  const displayAmount = asDeduction && amount > 0 ? -amount : amount
  let color: string = C.ink
  if (isZero) color = C.zero
  else if (displayAmount < 0 || (asDeduction && amount > 0)) color = C.deduction
  if (bold && !isZero) color = C.headerBg

  const text =
    asDeduction && amount > 0
      ? formatZARTableDeduction(amount)
      : formatZARTable(displayAmount)

  return (
    <Text
      wrap={false}
      style={[
        styles.moneyCell,
        compact ? styles.moneyCellFirstPage : {},
        { color, fontFamily: bold ? FONT_BOLD : FONT },
      ]}
    >
      {text}
    </Text>
  )
}

function BookingCol({
  width,
  children,
  align = "right",
  isLast = false,
  header = false,
  bold = false,
  money = false,
  compact = false,
}: {
  width: string
  children: ReactNode
  align?: "left" | "right"
  isLast?: boolean
  header?: boolean
  bold?: boolean
  money?: boolean
  compact?: boolean
}) {
  const base = header ? styles.headerCell : money ? styles.dataCellMoney : styles.dataCell
  const compactBase = header
    ? styles.headerCellFirstPage
    : money
      ? styles.dataCellMoneyFirstPage
      : styles.dataCellFirstPage
  const cellStyle = [
    base,
    compact ? compactBase : {},
    { width, textAlign: align },
    isLast ? (header ? styles.headerCellLast : styles.dataCellLast) : {},
  ]
  return (
    <View style={cellStyle}>
      {typeof children === "string" ? (
        <Text
          wrap={false}
          style={
            header
              ? {
                  fontFamily: FONT_BOLD,
                  fontSize: compact ? 6.5 : 7,
                  letterSpacing: 0.4,
                  color: C.muted,
                  textTransform: "uppercase",
                }
              : bold
                ? { fontFamily: FONT_BOLD, fontSize: compact ? 9.5 : 11, color: C.headerBg }
                : { fontFamily: FONT }
          }
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

const BOOKING_HEADERS = [
  "GUEST · CHANNEL · STAY",
  "ACCOM.",
  "DISCOUNT",
  "EXTRA",
  "CLEANING",
  "UPSELLS",
  "TAXES",
  "CHANNEL COMM.",
  "MGMT FEE",
  "PROCESSING",
  "PAYOUT",
] as const

function BookingMoneyCells({
  row,
  bold,
  compact,
}: {
  row: OwnerStatementSnapshotBookingV1
  bold?: boolean
  compact?: boolean
}) {
  return (
    <>
      <BookingCol width={BOOKING_COL_WIDTHS[1]} money compact={compact}>
        <MoneyCellText amount={row.accommodation_total} bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[2]} money compact={compact}>
        <MoneyCellText amount={row.discount} asDeduction bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[3]} money compact={compact}>
        <MoneyCellText amount={row.extra_charges} bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[4]} money compact={compact}>
        <MoneyCellText amount={row.cleaning_fee} bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[5]} money compact={compact}>
        <MoneyCellText amount={row.upsells} bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[6]} money compact={compact}>
        <MoneyCellText amount={row.booking_taxes} bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[7]} money compact={compact}>
        <MoneyCellText amount={row.channel_commission} asDeduction bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[8]} money compact={compact}>
        <MoneyCellText amount={row.total_management_fee} asDeduction bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[9]} money compact={compact}>
        <MoneyCellText amount={row.payment_processing_fee} asDeduction bold={bold} compact={compact} />
      </BookingCol>
      <BookingCol width={BOOKING_COL_WIDTHS[10]} isLast money compact={compact}>
        <MoneyCellText amount={row.total_payout} bold={bold} compact={compact} />
      </BookingCol>
    </>
  )
}

function StatementContinuationHeader({
  propertyName,
  month,
  year,
  suffix = "Bookings (continued)",
}: {
  propertyName: string
  month: number
  year: number
  suffix?: string
}) {
  return (
    <View style={styles.bleedHeaderWrap} wrap={false}>
      <View style={styles.continuationHeader}>
        <Text style={styles.continuationTitle}>{propertyName}</Text>
        <Text style={styles.continuationMeta}>
          {formatMonthYear(month, year)} · {suffix}
        </Text>
      </View>
    </View>
  )
}

function BookingsTable({
  rows,
  totalRow,
  showTotal,
  compact = false,
  periodMonthName,
}: {
  rows: OwnerStatementSnapshotBookingV1[]
  totalRow: OwnerStatementSnapshotBookingV1
  showTotal: boolean
  compact?: boolean
  periodMonthName: string
}) {
  return (
    <View style={styles.tableBorder}>
      <View style={[styles.tableRow, styles.tableHeaderRow]} wrap={false}>
        {BOOKING_HEADERS.map((label, i) => (
          <BookingCol
            key={label}
            width={BOOKING_COL_WIDTHS[i]}
            align={i === 0 ? "left" : "right"}
            header
            compact={compact}
            isLast={i === BOOKING_HEADERS.length - 1}
          >
            {label}
          </BookingCol>
        ))}
      </View>
      {rows.map((row, index) => (
        <View
          key={row.id}
          wrap={false}
          style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
        >
          <BookingCol width={BOOKING_COL_WIDTHS[0]} align="left" compact={compact}>
            <Text style={compact ? styles.guestNameFirstPage : styles.guestName}>{row.guest_name}</Text>
            <Text style={compact ? styles.guestMetaFirstPage : styles.guestMeta}>
              {row.channel_label} ·{" "}
              {compact
                ? `${formatStayDateCompact(row.check_in)} – ${formatStayDateCompact(row.check_out)}`
                : `${formatStayDate(row.check_in)} – ${formatStayDate(row.check_out)}`}{" "}
              · {row.num_nights} night{row.num_nights === 1 ? "" : "s"}
            </Text>
            {row.is_prorated && row.nights_in_period != null && row.total_stay_nights != null ? (
              <Text style={styles.prorationLine}>
                Pro-rated: {row.nights_in_period} of {row.total_stay_nights} nights ({periodMonthName}{" "}
                share)
              </Text>
            ) : null}
            {row.is_manual_override && row.manual_note ? (
              <Text style={styles.prorationLine}>Manual override: {row.manual_note}</Text>
            ) : null}
          </BookingCol>
          <BookingMoneyCells row={row} compact={compact} />
        </View>
      ))}
      {showTotal ? (
        <View wrap={false} style={[styles.tableRow, styles.tableTotalRow]}>
          <BookingCol width={BOOKING_COL_WIDTHS[0]} align="left" bold compact={compact}>
            Total
          </BookingCol>
          <BookingMoneyCells row={totalRow} bold compact={compact} />
        </View>
      ) : null}
    </View>
  )
}

function StatementFinancialSection({
  expenseLines,
  expenseTotal,
  grossRevenue,
  channelCommissions,
  totalManagementFees,
  otaPayout,
  totalExpenses,
  ownerPayout,
  totalDiscounts,
  hasProratedBookings = false,
  periodMonthName,
}: {
  expenseLines: OwnerStatementExpenseComputed[]
  expenseTotal: number
  grossRevenue: number
  channelCommissions: number
  totalManagementFees: number
  otaPayout: number
  totalExpenses: number
  ownerPayout: number
  totalDiscounts: number
  hasProratedBookings?: boolean
  periodMonthName?: string
}) {
  return (
    <View style={styles.financialStack}>
      <View style={styles.financialBlock}>
        <Text style={styles.sectionHeading}>ADDITIONAL EXPENSES</Text>
        <View style={styles.tableBorder}>
          <View style={[styles.tableRow, styles.tableHeaderRow]} wrap={false}>
            {["DESCRIPTION", "QTY", "UNIT PRICE", "SERVICE FEE", "TOTAL AMOUNT"].map((label, i) => (
              <BookingCol
                key={label}
                width={EXPENSE_COL_WIDTHS[i]}
                align={i === 0 ? "left" : "right"}
                header
                isLast={i === 4}
              >
                {label}
              </BookingCol>
            ))}
          </View>
          {expenseLines.length === 0 ? (
            <View style={styles.tableRow} wrap={false}>
              <View style={{ width: "100%", borderBottomWidth: 0.5, borderBottomColor: C.borderSoft }}>
                <Text style={styles.emptyExpense}>No additional expenses recorded</Text>
              </View>
            </View>
          ) : (
            expenseLines.map((line, index) => {
              const serviceFee = expenseServiceFee(line)
              return (
                <View
                  key={line.key}
                  wrap={false}
                  style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                >
                  <BookingCol width={EXPENSE_COL_WIDTHS[0]} align="left">
                    <Text style={{ fontFamily: FONT, fontSize: 10, color: C.ink }}>{line.label}</Text>
                  </BookingCol>
                  <BookingCol width={EXPENSE_COL_WIDTHS[1]}>
                    <Text style={[styles.moneyCell, { color: line.quantity == null ? C.dash : C.ink }]}>
                      {line.quantity != null ? String(line.quantity) : "—"}
                    </Text>
                  </BookingCol>
                  <BookingCol width={EXPENSE_COL_WIDTHS[2]}>
                    <Text style={[styles.moneyCell, { color: line.unitPrice == null ? C.dash : C.ink }]}>
                      {line.unitPrice != null ? formatZAR(line.unitPrice) : "—"}
                    </Text>
                  </BookingCol>
                  <BookingCol width={EXPENSE_COL_WIDTHS[3]}>
                    <Text style={[styles.moneyCell, { color: serviceFee == null ? C.dash : C.ink }]}>
                      {serviceFee != null ? formatZAR(serviceFee) : "—"}
                    </Text>
                  </BookingCol>
                  <BookingCol width={EXPENSE_COL_WIDTHS[4]} isLast>
                    <MoneyCellText amount={line.chargedAmount} bold />
                  </BookingCol>
                </View>
              )
            })
          )}
          {expenseLines.length > 0 ? (
            <View wrap={false} style={[styles.tableRow, styles.tableTotalRow]}>
              <BookingCol width={EXPENSE_COL_WIDTHS[0]} align="left" bold>
                Total expenses
              </BookingCol>
              <BookingCol width={EXPENSE_COL_WIDTHS[1]}>
                <Text> </Text>
              </BookingCol>
              <BookingCol width={EXPENSE_COL_WIDTHS[2]}>
                <Text> </Text>
              </BookingCol>
              <BookingCol width={EXPENSE_COL_WIDTHS[3]}>
                <Text> </Text>
              </BookingCol>
              <BookingCol width={EXPENSE_COL_WIDTHS[4]} isLast>
                <MoneyCellText amount={expenseTotal} bold />
              </BookingCol>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.financialBlock}>
        <Text style={styles.sectionHeading}>FINANCIAL SUMMARY</Text>
        <View style={styles.summaryRow}>
          <Text style={{ fontFamily: FONT }}>Revenue</Text>
          <Text style={{ fontFamily: FONT }}>{formatZAR(grossRevenue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontFamily: FONT }}>Less: Booking fees</Text>
          <Text style={{ fontFamily: FONT }}>{formatZARDeduction(channelCommissions)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontFamily: FONT }}>Less: Management fees</Text>
          <Text style={{ fontFamily: FONT }}>{formatZARDeduction(totalManagementFees)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontFamily: FONT }}>OTA payout (ref.)</Text>
          <Text style={{ fontFamily: FONT }}>{formatZAR(otaPayout)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontFamily: FONT }}>Less: Expenses</Text>
          <Text style={{ fontFamily: FONT }}>{formatZARDeduction(totalExpenses)}</Text>
        </View>
        <View style={styles.summaryPayoutRow}>
          <Text style={styles.summaryPayoutLabel}>Owner payout</Text>
          <Text style={styles.summaryPayoutValue}>{formatZAR(ownerPayout)}</Text>
        </View>
        {hasProratedBookings && periodMonthName ? (
          <Text style={styles.prorationFootnote}>
            One or more bookings span multiple months. Amounts above are pro-rated by occupied nights in{" "}
            {periodMonthName} — not the full booking value from Uplisting.
          </Text>
        ) : null}
        {totalDiscounts > 0 ? (
          <Text style={styles.discountNote}>
            Guest discounts of {formatZAR(totalDiscounts)} are shown in the booking table and are already reflected
            in revenue and OTA payouts.
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  occupancyBar,
  compact = false,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
  occupancyBar?: number
  compact?: boolean
}) {
  const cardStyle = accent
    ? [styles.kpiCard, styles.kpiCardAccent, compact ? styles.kpiCardFirstPage : {}]
    : [styles.kpiCard, compact ? styles.kpiCardFirstPage : {}]

  return (
    <View style={cardStyle}>
      <Text style={compact ? [styles.kpiLabel, styles.kpiLabelFirstPage] : styles.kpiLabel}>{label}</Text>
      <Text
        style={
          accent
            ? [styles.kpiValue, styles.kpiValueAccent, compact ? styles.kpiValueFirstPage : {}]
            : [styles.kpiValue, compact ? styles.kpiValueFirstPage : {}]
        }
      >
        {value}
      </Text>
      <Text style={compact ? [styles.kpiSub, styles.kpiSubFirstPage] : styles.kpiSub}>{sub}</Text>
      {occupancyBar != null ? (
        <View style={compact ? styles.occupancyTrackFirstPage : styles.occupancyTrack}>
          <View
            style={[
              compact ? styles.occupancyFillFirstPage : styles.occupancyFill,
              { width: `${Math.min(100, Math.max(0, occupancyBar))}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
  )
}

export function OwnerStatementPdfDocument({
  snapshot,
  meta,
  companySettings,
}: {
  snapshot: OwnerStatementSnapshotV1
  meta: OwnerStatementPdfMeta
  companySettings: CompanySettingsPdf
}) {
  const { lines: expenseLines } = computeExpenses(snapshot.manualLines, snapshot.receiptLines)
  const t = snapshot.totals
  const { month, year } = snapshot

  const rows = snapshot.bookings.map(normaliseBooking)
  const feeSums = sumBookings(rows)
  const channelCommissions = feeSums.channelCommission
  const totalPaymentProcessingFees = feeSums.processingFee
  const totalBookingFees = roundMoney(channelCommissions + totalPaymentProcessingFees)
  const totalManagementFees = feeSums.managementFee

  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))
  const bookedNights = rows.reduce((s, r) => s + r.num_nights, 0)
  const occupancyRate = daysInMonth > 0 ? (bookedNights / daysInMonth) * 100 : 0

  const grossRevenue = t.totalGross ?? 0
  const totalExpenses = t.otherExpenses ?? 0
  const ownerPayout = t.netToOwner ?? 0
  const totalDiscounts = t.totalDiscount ?? 0
  const otaPayout = t.totalPayout ?? 0

  const totalRow: OwnerStatementSnapshotBookingV1 = {
    id: "total",
    guest_name: "Total",
    check_in: "",
    check_out: "",
    num_nights: 0,
    channel_label: "",
    accommodation_total: rows.reduce((s, r) => s + r.accommodation_total, 0),
    discount: rows.reduce((s, r) => s + r.discount, 0),
    extra_guest_charge: rows.reduce((s, r) => s + r.extra_guest_charge, 0),
    cleaning_fee: rows.reduce((s, r) => s + r.cleaning_fee, 0),
    extra_charges: rows.reduce((s, r) => s + r.extra_charges, 0),
    upsells: rows.reduce((s, r) => s + r.upsells, 0),
    booking_taxes: rows.reduce((s, r) => s + r.booking_taxes, 0),
    channel_commission: rows.reduce((s, r) => s + r.channel_commission, 0),
    total_management_fee: rows.reduce((s, r) => s + r.total_management_fee, 0),
    payment_processing_fee: rows.reduce((s, r) => s + r.payment_processing_fee, 0),
    total_payout: otaPayout,
  }

  const generatedDate = new Date().toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const expenseTotal = expenseLines.reduce((s, l) => s + l.chargedAmount, 0)
  const channelSlices = buildStatementChannelSlices(rows)
  const incomeExpense = computeStatementIncomeExpense(rows, ownerPayout, totalExpenses)
  const analyticsSummary = computeStatementAnalyticsSummary({
    bookingCount: rows.length,
    bookedNights,
    daysInMonth,
    occupancyRate,
    grossRevenue,
  })

  const bookingChunks = chunkStatementBookings(rows)
  const propertyBuildingLine = formatPropertyBuildingLine(
    meta.propertyBuildingName,
    meta.propertyUnitNumber
  )
  const periodMonthName = formatMonthName(month)
  const hasProratedBookings = rows.some((r) => r.is_prorated)
  const financialProps = {
    expenseLines,
    expenseTotal,
    grossRevenue,
    channelCommissions,
    totalManagementFees,
    otaPayout,
    totalExpenses,
    ownerPayout,
    totalDiscounts,
    hasProratedBookings,
    periodMonthName,
  }

  return (
    <Document
      title={`Owner statement — ${meta.propertyName} — ${formatMonthYear(month, year)}`}
      author="Right Stay Africa"
    >
      {bookingChunks.map((chunk, chunkIndex) => (
        <Page key={`bookings-${chunkIndex}`} size="A4" orientation="landscape" style={styles.page}>
          {chunkIndex === 0 ? (
            <>
              <View style={styles.bleedHeaderWrap} wrap={false}>
                <View style={[styles.header, styles.headerFirstPage]}>
                  <View style={styles.headerRow1}>
                    <Image src={getStatementLogoDataUri()} style={[styles.logo, styles.logoFirstPage]} />
                    <View style={styles.periodBlock}>
                      <Text style={styles.periodLabel}>OWNER STATEMENT</Text>
                      <Text style={[styles.periodMonth, styles.periodMonthFirstPage]}>
                        {formatMonthYear(month, year)}
                      </Text>
                      <Text style={[styles.periodRange, styles.periodRangeFirstPage]}>
                        {formatPeriodRange(month, year)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.headerRow2, styles.headerRow2FirstPage]}>
                    <Text style={[styles.propertyName, styles.propertyNameFirstPage]}>{meta.propertyName}</Text>
                    {propertyBuildingLine ? (
                      <Text style={styles.propertyUnit}>{propertyBuildingLine}</Text>
                    ) : null}
                    <Text style={[styles.propertyAddress, styles.propertyAddressFirstPage]}>
                      {meta.propertyAddressLine}
                    </Text>
                  </View>
                  <View style={[styles.headerRow3, styles.headerRow3FirstPage]}>
                    <View>
                      <Text style={[styles.ownerLabel, styles.ownerLabelFirstPage]}>PROPERTY OWNER</Text>
                      <Text style={[styles.ownerName, styles.ownerNameFirstPage]}>
                        {meta.ownerName ?? "—"}
                      </Text>
                    </View>
                    <Text style={[styles.zarNote, styles.zarNoteFirstPage]}>All amounts in ZAR</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.kpiStrip, styles.bleedBlock, styles.kpiStripFirstPage]} wrap={false}>
                <KpiCard
                  compact
                  label="REVENUE"
                  value={formatZAR(grossRevenue)}
                  sub="Gross accommodation"
                />
                <KpiCard
                  compact
                  label="BOOKING FEES"
                  value={formatZAR(totalBookingFees)}
                  sub="Commissions & processing"
                />
                <KpiCard
                  compact
                  label="MGMT FEES"
                  value={formatZAR(totalManagementFees)}
                  sub="Management fees"
                />
                <KpiCard compact label="EXPENSES" value={formatZAR(totalExpenses)} sub="Additional items" />
                <KpiCard
                  compact
                  label="OCCUPANCY"
                  value={`${occupancyRate.toFixed(1)}%`}
                  sub={`${bookedNights} of ${daysInMonth} nights booked`}
                  occupancyBar={occupancyRate}
                />
                <KpiCard
                  compact
                  label="OWNER PAYOUT"
                  value={formatZAR(ownerPayout)}
                  sub="Net after all deductions"
                  accent
                />
              </View>
            </>
          ) : (
            <StatementContinuationHeader
              propertyName={meta.propertyName}
              month={month}
              year={year}
            />
          )}

          <View style={chunkIndex === 0 ? [styles.sectionPad, styles.sectionPadFirstPage] : styles.sectionPad}>
            <Text
              style={
                chunkIndex === 0
                  ? [styles.sectionHeading, styles.sectionHeadingFirstPage]
                  : styles.sectionHeading
              }
            >
              {chunkIndex === 0 ? "BOOKINGS" : "BOOKINGS (CONTINUED)"}
            </Text>
            <BookingsTable
              rows={chunk}
              totalRow={totalRow}
              showTotal={chunkIndex === bookingChunks.length - 1}
              compact={chunkIndex === 0}
              periodMonthName={periodMonthName}
            />
          </View>

          <StatementPdfFooter
            generatedDate={generatedDate}
            backgroundColor={C.white}
            companySettings={companySettings}
          />
        </Page>
      ))}

      <Page size="A4" orientation="landscape" style={styles.page}>
        <StatementContinuationHeader
          propertyName={meta.propertyName}
          month={month}
          year={year}
          suffix="Expenses & financial summary"
        />
        <View style={styles.sectionPadFinancial}>
          <StatementFinancialSection {...financialProps} />
        </View>
        <StatementPdfFooter
          generatedDate={generatedDate}
          backgroundColor={C.white}
          companySettings={companySettings}
        />
      </Page>

      <Page
        size="A4"
        orientation="landscape"
        style={[styles.page, { backgroundColor: C.stripBg }]}
      >
        <OwnerStatementPdfAnalyticsPage
          channelSlices={channelSlices}
          incomeExpense={incomeExpense}
          summary={analyticsSummary}
          periodLabel={formatMonthYear(month, year)}
          periodRange={formatPeriodRange(month, year)}
          propertyName={meta.propertyName}
          propertyBuildingLine={propertyBuildingLine}
        />
        <StatementPdfFooter
          generatedDate={generatedDate}
          backgroundColor="#f5f7f5"
          metaSuffix="CSV import data and PMS expenses"
          companySettings={companySettings}
        />
      </Page>
    </Document>
  )
}
