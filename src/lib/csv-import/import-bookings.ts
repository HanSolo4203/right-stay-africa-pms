import {
  type Booking,
  type BookingSource,
  type BookingStatus,
  type CsvImportLog,
  Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { ParsedBookingRow } from "@/lib/csv-import/parse-bookings-csv"

/** Interactive transactions default to 5s; monthly CSVs need longer. */
const IMPORT_TX_MAX_WAIT_MS = 15_000
const IMPORT_TX_TIMEOUT_MS = 180_000

export type ImportDb = Prisma.TransactionClient | typeof prisma

export type BookingCsvUpsertPayload = {
  property_id: string
  confirmation_code: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  check_in: Date
  check_out: Date
  num_guests: number
  source: BookingSource
  channel_name: string
  reference: string | null
  status: BookingStatus
  total: number
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
  notes: string | null
  csv_imported_at: Date
  csv_row_hash: string
}

function d(n: number): Prisma.Decimal {
  return new Prisma.Decimal(Number.isFinite(n) ? String(n) : "0")
}

function isMeaningfulDecimal(value: Prisma.Decimal | null | undefined): boolean {
  return value != null
}

function mergeOptionalDecimal(
  existing: Prisma.Decimal | null | undefined,
  incoming: number
): Prisma.Decimal | undefined {
  if (isMeaningfulDecimal(existing) && incoming === 0) {
    return undefined
  }
  return d(incoming)
}

function mergeOptionalString(
  existing: string | null | undefined,
  incoming: string | null
): string | null | undefined {
  if (existing != null && existing !== "" && (incoming === null || incoming === "")) {
    return undefined
  }
  return incoming
}

function nightlyRateForCreate(row: ParsedBookingRow): Prisma.Decimal {
  if (row.num_nights > 0 && row.accommodation_total > 0) {
    return d(row.accommodation_total / row.num_nights)
  }
  return d(0)
}

export function buildBookingUpsertData(
  row: ParsedBookingRow,
  propertyDbId: string
): BookingCsvUpsertPayload {
  return {
    property_id: propertyDbId,
    confirmation_code: row.confirmation_code,
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    check_in: row.check_in,
    check_out: row.check_out,
    num_guests: row.num_guests,
    source: row.source,
    channel_name: row.channel_name,
    reference: row.confirmation_code,
    status: row.status,
    total: row.total_payout,
    total_payout: row.total_payout,
    accommodation_total: row.accommodation_total,
    cleaning_fee: row.cleaning_fee,
    discount: row.discount,
    extra_guest_charge: row.extra_guest_charge,
    extra_charges: row.extra_charges,
    upsells: row.upsells,
    booking_taxes: row.booking_taxes,
    commission: row.commission,
    commission_tax: row.commission_tax,
    total_management_fee: row.total_management_fee,
    payment_processing_fee: row.payment_processing_fee,
    gross_revenue: row.gross_revenue,
    net_revenue: row.net_revenue,
    notes: row.note,
    csv_imported_at: new Date(),
    csv_row_hash: row.raw_hash,
  }
}

function payloadToCreateInput(
  payload: BookingCsvUpsertPayload,
  row: ParsedBookingRow
): Prisma.BookingUncheckedCreateInput {
  return {
    property_id: payload.property_id,
    confirmation_code: payload.confirmation_code,
    guest_name: payload.guest_name,
    guest_email: payload.guest_email,
    guest_phone: payload.guest_phone,
    check_in: payload.check_in,
    check_out: payload.check_out,
    num_guests: payload.num_guests,
    source: payload.source,
    channel_name: payload.channel_name,
    reference: payload.reference,
    status: payload.status,
    total: d(payload.total),
    nightly_rate: nightlyRateForCreate(row),
    total_payout: d(payload.total_payout),
    accommodation_total: d(payload.accommodation_total),
    cleaning_fee: d(payload.cleaning_fee),
    discount: d(payload.discount),
    extra_guest_charge: d(payload.extra_guest_charge),
    extra_charges: d(payload.extra_charges),
    upsells: d(payload.upsells),
    booking_taxes: d(payload.booking_taxes),
    commission: d(payload.commission),
    commission_tax: d(payload.commission_tax),
    total_management_fee: d(payload.total_management_fee),
    payment_processing_fee: d(payload.payment_processing_fee),
    gross_revenue: d(payload.gross_revenue),
    net_revenue: d(payload.net_revenue),
    notes: payload.notes,
    csv_imported_at: payload.csv_imported_at,
    csv_row_hash: payload.csv_row_hash,
  }
}

function payloadToUpdateInput(
  existing: Booking,
  payload: BookingCsvUpsertPayload
): Prisma.BookingUncheckedUpdateInput {
  const out: Prisma.BookingUncheckedUpdateInput = {
    property_id: payload.property_id,
    guest_name: payload.guest_name,
    check_in: payload.check_in,
    check_out: payload.check_out,
    num_guests: payload.num_guests,
    source: payload.source,
    status: payload.status,
    csv_imported_at: payload.csv_imported_at,
    csv_row_hash: payload.csv_row_hash,
  }

  const confirmationNext = mergeOptionalString(existing.confirmation_code, payload.confirmation_code)
  if (confirmationNext !== undefined) out.confirmation_code = confirmationNext

  const referenceNext = mergeOptionalString(existing.reference, payload.reference)
  if (referenceNext !== undefined) out.reference = referenceNext

  const channelNext = mergeOptionalString(existing.channel_name, payload.channel_name)
  if (channelNext !== undefined) out.channel_name = channelNext

  const totalP = mergeOptionalDecimal(existing.total, payload.total_payout)
  if (totalP !== undefined) {
    out.total = totalP
    out.total_payout = totalP
  }

  const acc = mergeOptionalDecimal(existing.accommodation_total, payload.accommodation_total)
  if (acc !== undefined) out.accommodation_total = acc

  const clean = mergeOptionalDecimal(existing.cleaning_fee, payload.cleaning_fee)
  if (clean !== undefined) out.cleaning_fee = clean

  const disc = mergeOptionalDecimal(existing.discount, payload.discount)
  if (disc !== undefined) out.discount = disc

  const extGuest = mergeOptionalDecimal(existing.extra_guest_charge, payload.extra_guest_charge)
  if (extGuest !== undefined) out.extra_guest_charge = extGuest

  const extChg = mergeOptionalDecimal(existing.extra_charges, payload.extra_charges)
  if (extChg !== undefined) out.extra_charges = extChg

  const ups = mergeOptionalDecimal(existing.upsells, payload.upsells)
  if (ups !== undefined) out.upsells = ups

  const tax = mergeOptionalDecimal(existing.booking_taxes, payload.booking_taxes)
  if (tax !== undefined) out.booking_taxes = tax

  const gross = mergeOptionalDecimal(existing.gross_revenue, payload.gross_revenue)
  if (gross !== undefined) out.gross_revenue = gross

  const net = mergeOptionalDecimal(existing.net_revenue, payload.net_revenue)
  if (net !== undefined) out.net_revenue = net

  const comm = mergeOptionalDecimal(existing.commission, payload.commission)
  if (comm !== undefined) out.commission = comm

  const commTax = mergeOptionalDecimal(existing.commission_tax, payload.commission_tax)
  if (commTax !== undefined) out.commission_tax = commTax

  const mgmt = mergeOptionalDecimal(existing.total_management_fee, payload.total_management_fee)
  if (mgmt !== undefined) out.total_management_fee = mgmt

  const ppf = mergeOptionalDecimal(existing.payment_processing_fee, payload.payment_processing_fee)
  if (ppf !== undefined) out.payment_processing_fee = ppf

  const email = mergeOptionalString(existing.guest_email, payload.guest_email)
  if (email !== undefined) out.guest_email = email

  const phone = mergeOptionalString(existing.guest_phone, payload.guest_phone)
  if (phone !== undefined) out.guest_phone = phone

  return out
}

async function findMatchingBookingWithClient(
  db: ImportDb,
  row: ParsedBookingRow,
  propertyDbId: string
): Promise<Booking | null> {
  const code = row.confirmation_code?.trim()
  if (code) {
    return db.booking.findUnique({
      where: { confirmation_code: code },
    })
  }

  const nameNorm = row.guest_name.trim()
  return db.booking.findFirst({
    where: {
      property_id: propertyDbId,
      check_in: row.check_in,
      guest_name: { equals: nameNorm, mode: "insensitive" },
    },
  })
}

export async function findMatchingBooking(
  row: ParsedBookingRow,
  propertyDbId: string
): Promise<Booking | null> {
  return findMatchingBookingWithClient(prisma, row, propertyDbId)
}

export function hasBookingChanged(existing: Booking, row: ParsedBookingRow): boolean {
  if (existing.csv_row_hash != null && existing.csv_row_hash === row.raw_hash) {
    return false
  }
  return true
}

export type CsvImportErrorRow = { row: number; error: string }

export type PropertySummaryEntry = {
  new: number
  updated: number
  skipped: number
  property_name: string
}

export async function importBookingsFromCsv(
  rows: ParsedBookingRow[],
  importedBy?: string,
  filename: string = "bookings-import.csv"
): Promise<CsvImportLog> {
  const errors: CsvImportErrorRow[] = []
  let newRecords = 0
  let updatedRecords = 0
  let skippedRecords = 0
  const propertySummary: Record<string, PropertySummaryEntry> = {}

  const byUplistingId = new Map<string, ParsedBookingRow[]>()
  for (const row of rows) {
    const key = row.uplisting_property_id.trim()
    const list = byUplistingId.get(key) ?? []
    list.push(row)
    byUplistingId.set(key, list)
  }

  const uplistingIds = [...byUplistingId.keys()]
  const properties = await prisma.property.findMany({
    where: { uplisting_id: { in: uplistingIds } },
    select: { id: true, uplisting_id: true, name: true },
  })
  const propertyByUplisting = new Map(
    properties.map((p) => [p.uplisting_id!.trim(), p] as const)
  )

  for (const uplistingId of uplistingIds) {
    const groupRows = byUplistingId.get(uplistingId)!
    const property = propertyByUplisting.get(uplistingId)

    if (!property || !property.uplisting_id) {
      for (const row of groupRows) {
        errors.push({
          row: row.row_index,
          error: `Property with Uplisting ID ${uplistingId} not found in database. Import those rows once the property is set up.`,
        })
      }
      continue
    }

    const summary: PropertySummaryEntry = {
      new: 0,
      updated: 0,
      skipped: 0,
      property_name: property.name,
    }
    propertySummary[uplistingId] = summary

    await prisma.$transaction(
      async (tx) => {
        for (const row of groupRows) {
          const existing = await findMatchingBookingWithClient(tx, row, property.id)
          const payload = buildBookingUpsertData(row, property.id)

          if (existing) {
            if (!hasBookingChanged(existing, row)) {
              summary.skipped += 1
              skippedRecords += 1
              continue
            }
            await tx.booking.update({
              where: { id: existing.id },
              data: payloadToUpdateInput(existing, payload),
            })
            summary.updated += 1
            updatedRecords += 1
            continue
          }

          await tx.booking.create({
            data: payloadToCreateInput(payload, row),
          })
          summary.new += 1
          newRecords += 1
        }
      },
      {
        maxWait: IMPORT_TX_MAX_WAIT_MS,
        timeout: IMPORT_TX_TIMEOUT_MS,
      }
    )
  }

  const errorRecords = errors.length

  return prisma.csvImportLog.create({
    data: {
      filename,
      total_rows: rows.length,
      new_records: newRecords,
      updated_records: updatedRecords,
      skipped_records: skippedRecords,
      error_records: errorRecords,
      errors: errors as unknown as Prisma.InputJsonValue,
      property_summary: propertySummary as unknown as Prisma.InputJsonValue,
      imported_by: importedBy ?? null,
    },
  })
}
