import { createHash } from "node:crypto"
import { parse } from "csv-parse/sync"

/** Fixed column count — positions match Uplisting export order for this parser. */
const RAW_COLUMN_COUNT = 34

export interface RawCsvBookingRow {
  guest_name: string
  property_nickname: string
  multi_unit_name: string
  check_in: string
  check_out: string
  number_of_guests: string
  number_of_nights: string
  total_payout: string
  channel_name: string
  status: string
  booked_at: string
  property_id: string
  currency: string
  booking_source: string
  guest_email: string
  guest_phone: string
  note: string
  confirmation_code: string
  accommodation_total: string
  cleaning_fee: string
  extra_guest_charges: string
  extra_charges: string
  discounts: string
  booking_taxes: string
  payment_processing_fee: string
  commission: string
  commission_tax: string
  cancellation_fee: string
  accommodation_management_fee: string
  cleaning_management_fee: string
  total_management_fee: string
  gross_revenue: string
  net_revenue: string
  balance: string
}

export type ParsedBookingSource = "AIRBNB" | "BOOKING_COM" | "DIRECT" | "OTHER"

export type ParsedBookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"

export interface ParsedBookingRow {
  confirmation_code: string | null
  uplisting_property_id: string
  property_nickname: string
  row_index: number
  raw_hash: string

  guest_name: string
  guest_email: string | null
  guest_phone: string | null

  check_in: Date
  check_out: Date
  booked_at: Date
  num_guests: number
  num_nights: number

  channel_name: string
  source: ParsedBookingSource
  status: ParsedBookingStatus

  total_payout: number
  accommodation_total: number
  cleaning_fee: number
  discount: number
  extra_guest_charge: number
  extra_charges: number
  upsells: number
  booking_taxes: number
  commission: number
  commission_tax: number
  total_management_fee: number
  payment_processing_fee: number
  gross_revenue: number
  net_revenue: number

  note: string | null
  currency: string
}

export function parseNumber(val: string): number {
  const t = val.trim()
  if (t === "") return 0
  const n = Number.parseFloat(t.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function mapChannelToSource(channel: string): ParsedBookingSource {
  const n = channel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
  if (n === "airbnb_official") return "AIRBNB"
  if (n === "booking_dot_com") return "BOOKING_COM"
  if (n === "uplisting") return "DIRECT"
  return "OTHER"
}

export function mapStatus(status: string): ParsedBookingStatus {
  const n = status.trim().toLowerCase().replace(/\s+/g, "_")
  if (n === "confirmed" || n === "needs_check_in") return "CONFIRMED"
  if (n === "checked_in") return "CHECKED_IN"
  if (n === "needs_check_out" || n === "checked_out") return "CHECKED_OUT"
  if (n === "cancelled") return "CANCELLED"
  return "CONFIRMED"
}

export function computeRowHash(raw: RawCsvBookingRow): string {
  const payload = Object.values(raw).join("|")
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

function padCells(cells: string[]): string[] {
  const out = cells.map((c) => (c == null ? "" : String(c)))
  while (out.length < RAW_COLUMN_COUNT) out.push("")
  return out.slice(0, RAW_COLUMN_COUNT)
}

function cellsToRawRow(cells: string[]): RawCsvBookingRow {
  const c = padCells(cells)
  return {
    guest_name: c[0] ?? "",
    property_nickname: c[1] ?? "",
    multi_unit_name: c[2] ?? "",
    check_in: c[3] ?? "",
    check_out: c[4] ?? "",
    number_of_guests: c[5] ?? "",
    number_of_nights: c[6] ?? "",
    total_payout: c[7] ?? "",
    channel_name: c[8] ?? "",
    status: c[9] ?? "",
    booked_at: c[10] ?? "",
    property_id: c[11] ?? "",
    currency: c[12] ?? "",
    booking_source: c[13] ?? "",
    guest_email: c[14] ?? "",
    guest_phone: c[15] ?? "",
    note: c[16] ?? "",
    confirmation_code: c[17] ?? "",
    accommodation_total: c[18] ?? "",
    cleaning_fee: c[19] ?? "",
    extra_guest_charges: c[20] ?? "",
    extra_charges: c[21] ?? "",
    discounts: c[22] ?? "",
    booking_taxes: c[23] ?? "",
    payment_processing_fee: c[24] ?? "",
    commission: c[25] ?? "",
    commission_tax: c[26] ?? "",
    cancellation_fee: c[27] ?? "",
    accommodation_management_fee: c[28] ?? "",
    cleaning_management_fee: c[29] ?? "",
    total_management_fee: c[30] ?? "",
    gross_revenue: c[31] ?? "",
    net_revenue: c[32] ?? "",
    balance: c[33] ?? "",
  }
}

function isRowEffectivelyEmpty(cells: string[]): boolean {
  return cells.every((cell) => !String(cell ?? "").trim())
}

function parseDateYyyyMmDd(value: string): Date | null {
  const t = value.trim()
  if (!t) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const d = Number(m[3])
    const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0))
    if (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mo &&
      dt.getUTCDate() === d
    ) {
      return dt
    }
    return null
  }
  const fallback = new Date(t)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function parseBookedAt(value: string, fallbackDate: Date): Date {
  const t = value.trim()
  if (!t) return new Date(fallbackDate)

  const withSeconds =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(t)
  const withoutSeconds =
    !withSeconds && /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(t)

  const m = withSeconds ?? withoutSeconds
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const d = Number(m[3])
    const hh = Number(m[4])
    const mm = Number(m[5])
    const ss = m[6] != null ? Number(m[6]) : 0
    const dt = new Date(Date.UTC(y, mo, d, hh, mm, ss, 0))
    if (!Number.isNaN(dt.getTime())) return dt
  }

  const parsed = new Date(t)
  if (!Number.isNaN(parsed.getTime())) return parsed

  return new Date(fallbackDate)
}

function rawToParsed(raw: RawCsvBookingRow, row_index: number): ParsedBookingRow {
  const check_in = parseDateYyyyMmDd(raw.check_in)!
  const check_out = parseDateYyyyMmDd(raw.check_out)!
  const booked_at = parseBookedAt(raw.booked_at, check_in)

  const confirmationTrimmed = raw.confirmation_code.trim()
  const guestName = raw.guest_name.trim() || "Guest"
  const channelDisplay = raw.channel_name.trim()
  const sourceKey = channelDisplay || raw.booking_source.trim()

  return {
    confirmation_code: confirmationTrimmed ? confirmationTrimmed : null,
    uplisting_property_id: raw.property_id.trim(),
    property_nickname: raw.property_nickname.trim(),
    row_index,
    raw_hash: computeRowHash(raw),

    guest_name: guestName,
    guest_email: raw.guest_email.trim() ? raw.guest_email.trim() : null,
    guest_phone: raw.guest_phone.trim() ? raw.guest_phone.trim() : null,

    check_in,
    check_out,
    booked_at,
    num_guests: Math.max(0, Math.round(parseNumber(raw.number_of_guests))),
    num_nights: Math.max(0, Math.round(parseNumber(raw.number_of_nights))),

    channel_name: channelDisplay,
    source: mapChannelToSource(sourceKey),
    status: mapStatus(raw.status),

    total_payout: parseNumber(raw.total_payout),
    accommodation_total: parseNumber(raw.accommodation_total),
    cleaning_fee: parseNumber(raw.cleaning_fee),
    discount: parseNumber(raw.discounts),
    extra_guest_charge: parseNumber(raw.extra_guest_charges),
    extra_charges: parseNumber(raw.extra_charges),
    upsells: 0, // Not in current Uplisting CSV format
    booking_taxes: parseNumber(raw.booking_taxes),
    commission: parseNumber(raw.commission),
    commission_tax: parseNumber(raw.commission_tax),
    total_management_fee: parseNumber(raw.total_management_fee),
    payment_processing_fee: parseNumber(raw.payment_processing_fee),
    gross_revenue: parseNumber(raw.gross_revenue),
    net_revenue: parseNumber(raw.net_revenue),

    note: raw.note.trim() ? raw.note.trim() : null,
    currency: raw.currency.trim() || "ZAR",
  }
}

export type ParseBookingsCsvError = { row: number; error: string }

export function parseBookingsCsv(csvText: string): {
  rows: ParsedBookingRow[]
  errors: ParseBookingsCsvError[]
} {
  const rows: ParsedBookingRow[] = []
  const errors: ParseBookingsCsvError[] = []

  let records: string[][]
  try {
    records = parse(csvText, {
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: false,
    }) as string[][]
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid CSV."
    return { rows: [], errors: [{ row: 0, error: message }] }
  }

  if (records.length === 0) {
    return { rows, errors }
  }

  for (let i = 1; i < records.length; i += 1) {
    const rowNumber = i + 1
    const cells = (records[i] ?? []).map((c) => (c == null ? "" : String(c)))

    if (isRowEffectivelyEmpty(cells)) {
      continue
    }

    const raw = cellsToRawRow(cells)

    if (!raw.property_id.trim()) {
      errors.push({ row: rowNumber, error: "property_id is required." })
      continue
    }

    const checkIn = parseDateYyyyMmDd(raw.check_in)
    if (!checkIn) {
      errors.push({ row: rowNumber, error: "check_in must be a valid date (YYYY-MM-DD)." })
      continue
    }

    const checkOut = parseDateYyyyMmDd(raw.check_out)
    if (!checkOut) {
      errors.push({ row: rowNumber, error: "check_out must be a valid date (YYYY-MM-DD)." })
      continue
    }

    rows.push(rawToParsed(raw, rowNumber))
  }

  return { rows, errors }
}
