"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { BookingStatus, StatementSource, StatementStatus } from "@prisma/client"
import { z } from "zod"
import { getUser } from "@/lib/auth/get-user"
import {
  buildAutomaticExpenseManualLines,
  mergeManualLinesWithAutomatic,
} from "@/lib/clients/automatic-statement-expenses"
import {
  buildScheduleCleaningExpenseLines,
  loadScheduleCleaningTasksForProperties,
} from "@/lib/cleaning/statement-expenses"
import { buildSnapshotV1 } from "@/lib/owner-statement/compute"
import { getCompanySettingsForPdf } from "@/lib/company-settings"
import { renderOwnerStatementPdf } from "@/lib/owner-statement/render-pdf"
import { bookingHasNightsInCalendarMonth } from "@/lib/owner-statement/statement-eligibility"
import type { OwnerStatementSnapshotV1 } from "@/lib/owner-statement/types"
import { prisma } from "@/lib/prisma"
import {
  allocationsForStatementMonth,
  bookingToSnapshotRow,
  type StatementBookingInput,
} from "@/lib/statement-calculator"
import { deleteFile, uploadFile } from "@/lib/supabase/storage"

const STATEMENTS_BUCKET = "documents"

const ACTIVE = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
])

const ownerStatementLineSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  addTenPercent: z.boolean(),
})

const receiptSelectionSchema = z.object({
  receiptId: z.string().uuid(),
  addTenPercent: z.boolean(),
})

const ownerStatementPayloadBaseSchema = z.object({
  statementId: z.string().uuid().optional(),
  propertyId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  bookingIds: z.array(z.string().uuid()),
  commissionPercentOverride: z.union([z.number().min(0).max(100), z.null()]).optional(),
  manualLines: z.array(ownerStatementLineSchema),
  receiptSelections: z.array(receiptSelectionSchema),
})

export type OwnerStatementPayloadInput = z.infer<typeof ownerStatementPayloadBaseSchema>

/** Align with `receipt.date.toISOString().split("T")[0]` in the dashboard payload. */
function dateInStatementMonth(d: Date, year: number, month: number): boolean {
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month
}

async function assertCanManageStatements() {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }
  return user
}

function revalidateStatementPaths(propertyId: string) {
  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/owner-portal/${propertyId}/statements`)
  revalidatePath("/clients/statements")
}

async function buildSnapshotFromPayload(
  payload: OwnerStatementPayloadInput,
  propertyCommission: number | null,
  welcomePackFeePerBooking: number,
  midStayCleanFee: number
): Promise<OwnerStatementSnapshotV1> {
  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: payload.bookingIds },
      property_id: payload.propertyId,
    },
    select: {
      id: true,
      guest_name: true,
      check_in: true,
      check_out: true,
      channel_name: true,
      source: true,
      accommodation_total: true,
      gross_revenue: true,
      discount: true,
      extra_guest_charge: true,
      cleaning_fee: true,
      extra_charges: true,
      upsells: true,
      booking_taxes: true,
      commission: true,
      commission_tax: true,
      total_management_fee: true,
      payment_processing_fee: true,
      total_payout: true,
      status: true,
      owner_statement_id: true,
    },
  })

  if (bookings.length !== payload.bookingIds.length) {
    throw new Error("One or more bookings were not found.")
  }

  for (const b of bookings) {
    if (!ACTIVE.has(b.status)) {
      throw new Error(`Booking "${b.guest_name}" is not active for statements.`)
    }
    if (!bookingHasNightsInCalendarMonth(b.check_in, b.check_out, payload.year, payload.month)) {
      throw new Error(
        `Booking "${b.guest_name}" must have occupied nights in the statement month.`
      )
    }
    if (b.owner_statement_id != null) {
      throw new Error(`Booking "${b.guest_name}" is already on another statement.`)
    }
  }

  const receiptIds = payload.receiptSelections.map((r) => r.receiptId)
  const receiptsDb =
    receiptIds.length === 0
      ? []
      : await prisma.receipt.findMany({
          where: { id: { in: receiptIds }, property_id: payload.propertyId },
          select: { id: true, supplier: true, amount: true, date: true },
        })

  if (receiptsDb.length !== receiptIds.length) {
    throw new Error("One or more receipts were not found.")
  }

  for (const r of receiptsDb) {
    if (!dateInStatementMonth(r.date, payload.year, payload.month)) {
      throw new Error("Each receipt must fall in the statement month.")
    }
  }

  const receiptLines = payload.receiptSelections.map((sel) => {
    const row = receiptsDb.find((r) => r.id === sel.receiptId)!
    return {
      receiptId: row.id,
      supplier: row.supplier,
      amount: Number(row.amount),
      addTenPercent: sel.addTenPercent,
    }
  })

  const bookingInputs = bookings as StatementBookingInput[]
  const snapshotBookings = allocationsForStatementMonth(
    bookingInputs,
    payload.year,
    payload.month
  ).map((a) => bookingToSnapshotRow(a.booking, a))

  const scheduleTasks =
    (
      await loadScheduleCleaningTasksForProperties(
        prisma,
        [payload.propertyId],
        payload.month,
        payload.year
      )
    ).get(payload.propertyId) ?? []
  const scheduleLines = buildScheduleCleaningExpenseLines(scheduleTasks, {
    selectedBookingIds: new Set(payload.bookingIds),
    defaultUnitPrice: midStayCleanFee,
  })

  const automaticLines = buildAutomaticExpenseManualLines(
    snapshotBookings.map((b) => ({
      id: b.id,
      guestName: b.guest_name,
      cleaningFee: b.cleaning_fee,
    })),
    welcomePackFeePerBooking,
    scheduleLines
  )

  return buildSnapshotV1({
    month: payload.month,
    year: payload.year,
    commissionPercentProperty: propertyCommission,
    commissionPercentOverride: payload.commissionPercentOverride ?? null,
    bookings: snapshotBookings,
    manualLines: mergeManualLinesWithAutomatic(payload.manualLines, automaticLines),
    receiptLines,
  })
}

export async function saveOwnerStatementDraft(raw: unknown) {
  try {
    await assertCanManageStatements()
  } catch (e) {
    console.error("[saveOwnerStatementDraft] auth", e)
    throw e
  }
  let payload: z.infer<typeof ownerStatementPayloadBaseSchema>
  try {
    payload = ownerStatementPayloadBaseSchema.parse(raw)
  } catch (e) {
    console.error("[saveOwnerStatementDraft] parse", e)
    throw e
  }

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: {
      right_stay_commission_percent: true,
      welcome_pack_fee: true,
      mid_stay_clean_fee: true,
    },
  })
  if (!property) throw new Error("Property not found.")

  const commissionProp =
    property.right_stay_commission_percent != null
      ? Number(property.right_stay_commission_percent)
      : null
  const welcomePack =
    property.welcome_pack_fee != null ? Number(property.welcome_pack_fee) : 0
  const midStayCleanFee =
    property.mid_stay_clean_fee != null ? Number(property.mid_stay_clean_fee) : 0

  let snapshot: OwnerStatementSnapshotV1
  try {
    snapshot = await buildSnapshotFromPayload(
      payload,
      commissionProp,
      welcomePack,
      midStayCleanFee
    )
  } catch (e) {
    console.error("[saveOwnerStatementDraft] buildSnapshot", e)
    throw e
  }

  const monthLabel = new Date(payload.year, payload.month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
  const displayName = `Owner statement draft — ${monthLabel}`

  if (payload.statementId) {
    const existing = await prisma.statement.findFirst({
      where: {
        id: payload.statementId,
        property_id: payload.propertyId,
        source: StatementSource.GENERATED,
        status: StatementStatus.DRAFT,
      },
    })
    if (!existing) throw new Error("Draft statement not found.")

    await prisma.statement.update({
      where: { id: existing.id },
      data: {
        month: payload.month,
        year: payload.year,
        file_name: displayName,
        notes: null,
        snapshot,
      },
    })
    revalidateStatementPaths(payload.propertyId)
    return { statementId: existing.id }
  }

  const created = await prisma.statement.create({
    data: {
      property_id: payload.propertyId,
      month: payload.month,
      year: payload.year,
      source: StatementSource.GENERATED,
      status: StatementStatus.DRAFT,
      file_url: null,
      file_name: displayName,
      snapshot,
    },
  })
  revalidateStatementPaths(payload.propertyId)
  return { statementId: created.id }
}

export async function previewOwnerStatementPdf(raw: unknown): Promise<{
  pdfBase64: string
  fileName: string
}> {
  await assertCanManageStatements()
  const payload = ownerStatementPayloadBaseSchema.parse(raw)

  if (payload.bookingIds.length === 0) {
    throw new Error("Select at least one booking to preview.")
  }

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: {
      name: true,
      address: true,
      city: true,
      suburb: true,
      unit_number: true,
      building_name: true,
      right_stay_commission_percent: true,
      welcome_pack_fee: true,
      mid_stay_clean_fee: true,
      owner: { select: { full_name: true } },
    },
  })
  if (!property) throw new Error("Property not found.")

  const commissionProp =
    property.right_stay_commission_percent != null
      ? Number(property.right_stay_commission_percent)
      : null
  const welcomePack =
    property.welcome_pack_fee != null ? Number(property.welcome_pack_fee) : 0
  const midStayCleanFee =
    property.mid_stay_clean_fee != null ? Number(property.mid_stay_clean_fee) : 0

  const snapshot = await buildSnapshotFromPayload(
    payload,
    commissionProp,
    welcomePack,
    midStayCleanFee
  )
  const companySettings = await getCompanySettingsForPdf()

  const buffer = await renderOwnerStatementPdf(
    snapshot,
    {
      propertyName: property.name,
      propertyAddressLine: [property.address, property.suburb, property.city].filter(Boolean).join(", "),
      propertyBuildingName: property.building_name ?? null,
      propertyUnitNumber: property.unit_number ?? null,
      ownerName: property.owner?.full_name ?? null,
      isFinal: false,
    },
    companySettings
  )

  const safeSlug = property.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  const fileName = `Preview-Owner-Statement_${payload.year}-${String(payload.month).padStart(2, "0")}_${safeSlug || "property"}.pdf`

  return { pdfBase64: buffer.toString("base64"), fileName }
}

export async function finalizeOwnerStatement(raw: unknown) {
  await assertCanManageStatements()
  const payload = ownerStatementPayloadBaseSchema.parse(raw)

  if (payload.bookingIds.length === 0) {
    throw new Error("Select at least one booking to finalize.")
  }

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: {
      name: true,
      address: true,
      city: true,
      suburb: true,
      unit_number: true,
      building_name: true,
      right_stay_commission_percent: true,
      welcome_pack_fee: true,
      mid_stay_clean_fee: true,
      owner: { select: { full_name: true } },
    },
  })
  if (!property) throw new Error("Property not found.")

  const commissionProp =
    property.right_stay_commission_percent != null
      ? Number(property.right_stay_commission_percent)
      : null
  const welcomePack =
    property.welcome_pack_fee != null ? Number(property.welcome_pack_fee) : 0
  const midStayCleanFee =
    property.mid_stay_clean_fee != null ? Number(property.mid_stay_clean_fee) : 0

  const snapshot = await buildSnapshotFromPayload(
    payload,
    commissionProp,
    welcomePack,
    midStayCleanFee
  )

  const duplicateFinal = await prisma.statement.findFirst({
    where: {
      property_id: payload.propertyId,
      month: payload.month,
      year: payload.year,
      source: StatementSource.GENERATED,
      status: StatementStatus.FINAL,
    },
  })
  if (duplicateFinal && duplicateFinal.id !== payload.statementId) {
    throw new Error("A finalized generated statement already exists for this month.")
  }

  const companySettings = await getCompanySettingsForPdf()

  const buffer = await renderOwnerStatementPdf(
    snapshot,
    {
      propertyName: property.name,
      propertyAddressLine: [property.address, property.suburb, property.city].filter(Boolean).join(", "),
      propertyBuildingName: property.building_name ?? null,
      propertyUnitNumber: property.unit_number ?? null,
      ownerName: property.owner?.full_name ?? null,
      isFinal: true,
    },
    companySettings
  )

  const fileId = randomUUID()
  const storagePath = `properties/${payload.propertyId}/statements/owner-statement_${payload.year}-${String(payload.month).padStart(2, "0")}_${fileId}.pdf`
  const safeSlug = property.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  const downloadName = `Owner-Statement_${payload.year}-${String(payload.month).padStart(2, "0")}_${safeSlug || "property"}.pdf`

  await uploadFile(
    STATEMENTS_BUCKET,
    storagePath,
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" })
  )

  const statementIdOut = await prisma.$transaction(async (tx) => {
    let statementId: string

    if (payload.statementId) {
      const existing = await tx.statement.findFirst({
        where: {
          id: payload.statementId,
          property_id: payload.propertyId,
          source: StatementSource.GENERATED,
          status: { in: [StatementStatus.DRAFT, StatementStatus.FINAL] },
        },
      })
      if (!existing) {
        throw new Error("Statement not found.")
      }
      await tx.statement.update({
        where: { id: payload.statementId },
        data: {
          month: payload.month,
          year: payload.year,
          file_url: storagePath,
          file_name: downloadName,
          status: StatementStatus.FINAL,
          snapshot,
        },
      })
      statementId = payload.statementId
    } else {
      const created = await tx.statement.create({
        data: {
          property_id: payload.propertyId,
          month: payload.month,
          year: payload.year,
          source: StatementSource.GENERATED,
          status: StatementStatus.FINAL,
          file_url: storagePath,
          file_name: downloadName,
          snapshot,
        },
      })
      statementId = created.id
    }

    await tx.booking.updateMany({
      where: {
        property_id: payload.propertyId,
        owner_statement_id: statementId,
        id: { notIn: payload.bookingIds },
      },
      data: { owner_statement_id: null },
    })
    await tx.booking.updateMany({
      where: { id: { in: payload.bookingIds }, property_id: payload.propertyId },
      data: { owner_statement_id: statementId },
    })

    return statementId
  })

  revalidateStatementPaths(payload.propertyId)
  return { statementId: statementIdOut }
}

export async function deleteOwnerStatementDraft(statementId: string, propertyId: string) {
  await assertCanManageStatements()
  const row = await prisma.statement.findFirst({
    where: {
      id: statementId,
      property_id: propertyId,
      source: StatementSource.GENERATED,
      status: StatementStatus.DRAFT,
    },
  })
  if (!row) throw new Error("Draft not found.")
  if (row.file_url) {
    await deleteFile(STATEMENTS_BUCKET, row.file_url)
  }
  await prisma.statement.delete({ where: { id: statementId } })
  revalidateStatementPaths(propertyId)
}
