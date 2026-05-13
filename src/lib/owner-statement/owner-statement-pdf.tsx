import "server-only"

import fs from "node:fs"
import path from "node:path"

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { OwnerStatementSnapshotBookingV1, OwnerStatementSnapshotV1 } from "./types"
import { computeExpenses } from "./compute"
import { formatMoneyZar, formatShortDate, formatStatementPeriod } from "./format-money"

let statementLogoDataUri: string | null = null

function getStatementLogoDataUri(): string {
  if (statementLogoDataUri) return statementLogoDataUri
  const filePath = path.join(process.cwd(), "public", "RSA NEW BLK BG.png")
  const buf = fs.readFileSync(filePath)
  statementLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`
  return statementLogoDataUri
}

/** Normalise booking to full shape (backwards compat for old snapshots). */
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
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  logoWrap: {
    marginBottom: 10,
    alignItems: "flex-start",
  },
  logo: {
    width: 168,
    height: 48,
    objectFit: "contain",
    objectPosition: "left",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  rowHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginBottom: 2,
  },
  colDetails: { width: "18%" },
  colNum: { width: "7%", textAlign: "right" },
  muted: { color: "#64748b", fontSize: 7 },
  summaryBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryNet: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    marginTop: 20,
    fontSize: 8,
    color: "#94a3b8",
  },
})

export type OwnerStatementPdfMeta = {
  propertyName: string
  propertyAddressLine: string
  ownerName: string | null
  isFinal: boolean
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  )
}

export function OwnerStatementPdfDocument({
  snapshot,
  meta,
}: {
  snapshot: OwnerStatementSnapshotV1
  meta: OwnerStatementPdfMeta
}) {
  const { lines: expenseLines } = computeExpenses(snapshot.manualLines, snapshot.receiptLines)
  const t = snapshot.totals
  const period = formatStatementPeriod(snapshot.month, snapshot.year)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoWrap}>
          <Image src={getStatementLogoDataUri()} style={styles.logo} />
        </View>
        <Text style={styles.title}>Owner statement</Text>
        <Text style={styles.subtitle}>{period}</Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{meta.propertyName}</Text>
          <Text style={styles.muted}>{meta.propertyAddressLine}</Text>
          {meta.ownerName ? (
            <Text style={{ marginTop: 4 }}>
              Owner: <Text style={{ fontFamily: "Helvetica-Bold" }}>{meta.ownerName}</Text>
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Bookings</Text>
        <Text style={[styles.muted, { marginBottom: 4 }]}>
          Full breakdown from CSV import. Amounts in ZAR.
        </Text>
        <View style={styles.rowHeader}>
          <Text style={[styles.colDetails, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
            Guest · Channel · Stay · Nights
          </Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Accom.</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Discount</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Extra guest</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Cleaning</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Extras</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Upsells</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Taxes</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Channel comm.</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Mgmt fee</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Proc. fee</Text>
          <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Payout</Text>
        </View>
        {snapshot.bookings.map((b) => {
          const row = normaliseBooking(b)
          return (
            <View key={row.id} style={styles.row} wrap={false}>
              <Text style={[styles.colDetails, { fontSize: 7 }]}>
                {row.guest_name}{"\n"}
                {row.channel_label}{"\n"}
                {formatShortDate(row.check_in)} – {formatShortDate(row.check_out)}{"\n"}
                Nights: {row.num_nights}
              </Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.accommodation_total)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>
                {row.discount !== 0 ? formatMoneyZar(-row.discount) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.extra_guest_charge)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.cleaning_fee)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.extra_charges)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.upsells)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>{formatMoneyZar(row.booking_taxes)}</Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>
                {row.channel_commission !== 0 ? formatMoneyZar(-row.channel_commission) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>
                {row.total_management_fee !== 0 ? formatMoneyZar(-row.total_management_fee) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontSize: 7 }]}>
                {row.payment_processing_fee !== 0 ? formatMoneyZar(-row.payment_processing_fee) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontSize: 7, fontFamily: "Helvetica-Bold" }]}>
                {formatMoneyZar(row.total_payout)}
              </Text>
            </View>
          )
        })}
        {(() => {
          const rows = snapshot.bookings.map(normaliseBooking)
          const totAcc = rows.reduce((s, r) => s + r.accommodation_total, 0)
          const totDisc = rows.reduce((s, r) => s + r.discount, 0)
          const totExtGuest = rows.reduce((s, r) => s + r.extra_guest_charge, 0)
          const totClean = rows.reduce((s, r) => s + r.cleaning_fee, 0)
          const totExtras = rows.reduce((s, r) => s + r.extra_charges, 0)
          const totUpsells = rows.reduce((s, r) => s + r.upsells, 0)
          const totTaxes = rows.reduce((s, r) => s + r.booking_taxes, 0)
          const totChannel = rows.reduce((s, r) => s + r.channel_commission, 0)
          const totMgmt = rows.reduce((s, r) => s + r.total_management_fee, 0)
          const totProc = rows.reduce((s, r) => s + r.payment_processing_fee, 0)
          return (
            <View style={[styles.row, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#cbd5e1" }]}>
              <Text style={[styles.colDetails, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>Total</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totAcc)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                {totDisc !== 0 ? formatMoneyZar(-totDisc) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totExtGuest)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totClean)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totExtras)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totUpsells)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{formatMoneyZar(totTaxes)}</Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                {totChannel !== 0 ? formatMoneyZar(-totChannel) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                {totMgmt !== 0 ? formatMoneyZar(-totMgmt) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                {totProc !== 0 ? formatMoneyZar(-totProc) : "—"}
              </Text>
              <Text style={[styles.colNum, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                {formatMoneyZar(t.totalPayout)}
              </Text>
            </View>
          )
        })()}

        <Text style={styles.sectionLabel}>Summary</Text>
        <View style={styles.summaryBox}>
          <SummaryLine label="Total payout" value={formatMoneyZar(t.totalPayout)} />
          <SummaryLine
            label={`Right Stay commission (${snapshot.commissionPercentEffective.toFixed(2)}%)`}
            value={`− ${formatMoneyZar(t.rsaCommission)}`}
          />
          <SummaryLine label="Cleaning fees (from bookings)" value={`− ${formatMoneyZar(t.totalCleaning)}`} />
          <SummaryLine label="Other expenses" value={`− ${formatMoneyZar(t.otherExpenses)}`} />
          <View style={styles.summaryNet}>
            <Text>Net to owner</Text>
            <Text>{formatMoneyZar(t.netToOwner)}</Text>
          </View>
        </View>

        {expenseLines.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Expense detail</Text>
            <View style={styles.rowHeader}>
              <Text style={{ width: "34%", fontFamily: "Helvetica-Bold" }}>Description</Text>
              <Text style={{ width: "10%", fontFamily: "Helvetica-Bold" }}>Qty</Text>
              <Text style={{ width: "16%", fontFamily: "Helvetica-Bold" }}>Unit price</Text>
              <Text style={{ width: "14%", fontFamily: "Helvetica-Bold" }}>Base</Text>
              <Text style={{ width: "10%", fontFamily: "Helvetica-Bold" }}>+10%</Text>
              <Text style={{ width: "16%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>Charged</Text>
            </View>
            {expenseLines.map((line) => (
              <View key={line.key} style={styles.row} wrap={false}>
                <Text style={{ width: "34%" }}>{line.label}</Text>
                <Text style={{ width: "10%" }}>
                  {line.quantity != null
                    ? new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 4 }).format(line.quantity)
                    : "—"}
                </Text>
                <Text style={{ width: "16%" }}>
                  {line.unitPrice != null ? formatMoneyZar(line.unitPrice) : "—"}
                </Text>
                <Text style={{ width: "14%" }}>{formatMoneyZar(line.baseAmount)}</Text>
                <Text style={{ width: "10%" }}>{line.addTenPercent ? "Yes" : "—"}</Text>
                <Text style={{ width: "16%", textAlign: "right" }}>{formatMoneyZar(line.chargedAmount)}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.footer}>
          Amounts in South African Rand (ZAR). This statement reflects CSV import data and expenses recorded in
          the PMS. Generated {new Date().toLocaleDateString("en-ZA")}.
        </Text>
      </Page>
    </Document>
  )
}
