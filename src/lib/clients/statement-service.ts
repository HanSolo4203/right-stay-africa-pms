import "server-only"

import { randomUUID } from "node:crypto"
import { BookingStatus, ClientStatus, StatementSource, StatementStatus } from "@prisma/client"
import { buildSnapshotV1 } from "@/lib/owner-statement/compute"
import { renderOwnerStatementPdf } from "@/lib/owner-statement/render-pdf"
import { checkInAllowedOnOwnerStatement } from "@/lib/owner-statement/statement-eligibility"
import {
  isOwnerStatementSnapshotV1,
  type OwnerStatementSnapshotV1,
} from "@/lib/owner-statement/types"
import { prisma } from "@/lib/prisma"
import { getAnalyticsChannelLabel } from "@/lib/property-booking-analytics"
import { expensesToManualLines, loadStatementExpenses } from "@/lib/clients/statement-expenses"
import { parseManagementFeeType } from "@/lib/clients/management-fee-calculator"
import { buildAutomaticExpenseManualLines } from "@/lib/clients/automatic-statement-expenses"
import { serializeStatementBookingRow } from "@/lib/clients/statement-booking-ui"
import {
  bookingToSnapshotRow,
  buildPropertyStatement,
  filterBookingsForStatementMonth,
  bookingIdsEligibleForStatementSelection,
  selectBookingIdsForAutoGenerate,
  statementBookingSelect,
  type StatementBookingInput,
} from "@/lib/statement-calculator"
import type { StatementExpenseItem } from "@/types/statement"
import { uploadFile } from "@/lib/supabase/storage"
import type { ClientStatementSummary } from "@/types/statement"

const STATEMENTS_BUCKET = "documents"

const ACTIVE = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
])

const bookingSelect = statementBookingSelect

export async function loadClientsWithStatements(
  month: number,
  year: number
): Promise<ClientStatementSummary[]> {
  const clients = await prisma.client.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      properties: {
        select: {
          id: true,
          name: true,
          right_stay_commission_percent: true,
          management_fee_type: true,
          welcome_pack_fee: true,
          bookings: {
            where: { status: { in: [...ACTIVE] } },
            select: bookingSelect,
          },
          statements: {
            where: {
              month,
              year,
              source: StatementSource.GENERATED,
            },
            select: {
              id: true,
              status: true,
              file_url: true,
              file_name: true,
              snapshot: true,
            },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
      },
    },
  })

  const unassigned = await prisma.property.findMany({
    where: { client_id: null },
    select: {
      id: true,
      name: true,
      right_stay_commission_percent: true,
      management_fee_type: true,
      welcome_pack_fee: true,
      owner: { select: { full_name: true, email: true } },
      bookings: {
        where: { status: { in: [...ACTIVE] } },
        select: bookingSelect,
      },
      statements: {
        where: { month, year, source: StatementSource.GENERATED },
        select: { id: true, status: true, file_url: true, file_name: true, snapshot: true },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  const summaries: ClientStatementSummary[] = await Promise.all(
    clients.map(async (c) => ({
      clientId: c.id,
      clientName: c.name,
      clientEmail: c.email,
      clientStatus: c.status,
      properties: await Promise.all(
        c.properties.map((p) => propertyToStatement(p, c.id, month, year, false))
      ),
    }))
  )

  for (const p of unassigned) {
    const ownerName = p.owner?.full_name?.trim()
    const label = ownerName ? `${ownerName} — ${p.name}` : `No owner — ${p.name}`
    summaries.push({
      clientId: `property:${p.id}`,
      clientName: label,
      clientEmail: p.owner?.email ?? "",
      clientStatus: ClientStatus.ACTIVE,
      properties: [
        await propertyToStatement(p, `property:${p.id}`, month, year, true),
      ],
    })
  }

  return summaries
}

function expenseItems(
  rows: Awaited<ReturnType<typeof loadStatementExpenses>>
): StatementExpenseItem[] {
  return rows.map((e) => ({
    id: e.id,
    description: e.description,
    qty: e.qty,
    unitPrice: e.unitPrice,
    total: e.total,
  }))
}

async function propertyToStatement(
  p: {
    id: string
    name: string
    right_stay_commission_percent: { toString: () => string } | null
    management_fee_type: string
    welcome_pack_fee: { toString: () => string } | null
    bookings: StatementBookingInput[]
    statements: Array<{
      id: string
      status: StatementStatus | null
      file_url: string | null
      file_name: string | null
      snapshot: unknown
    }>
  },
  clientId: string,
  month: number,
  year: number,
  isVirtualClient: boolean
) {
  const existing = p.statements[0]
  const commission =
    p.right_stay_commission_percent != null
      ? Number(p.right_stay_commission_percent)
      : null
  const expenses = isVirtualClient
    ? []
    : await loadStatementExpenses(clientId, p.id, month, year)
  const welcomePack =
    p.welcome_pack_fee != null ? Number(p.welcome_pack_fee) : 0

  const snap =
    existing?.snapshot != null && isOwnerStatementSnapshotV1(existing.snapshot)
      ? existing.snapshot
      : null
  const autoIds = selectBookingIdsForAutoGenerate(p.bookings, year, month)
  const bookingIdsForEditor =
    snap != null && snap.bookingIds.length > 0 ? snap.bookingIds : autoIds
  const editorBookings = p.bookings.filter((b) => bookingIdsForEditor.includes(b.id))

  const built = buildPropertyStatement({
    propertyId: p.id,
    propertyName: p.name,
    month,
    year,
    commissionPercentProperty: commission,
    managementFeeType: parseManagementFeeType(p.management_fee_type),
    welcomePackFeePerBooking: welcomePack,
    bookings: editorBookings,
    manualExpenses: expenseItems(expenses),
    existingStatementId: existing?.id ?? null,
    existingStatementStatus: existing?.status ?? null,
    hasPdf: Boolean(existing?.file_url),
    isVirtualClient,
  })

  return {
    ...built,
    existingStatementFileUrl: existing?.file_url ?? null,
    existingStatementFileName: existing?.file_name ?? null,
    bookings: p.bookings.map(serializeStatementBookingRow),
  }
}

export async function resolveClientPropertyIds(
  clientId: string
): Promise<{ propertyIds: string[]; isVirtual: boolean }> {
  if (clientId.startsWith("property:")) {
    const propertyId = clientId.slice("property:".length)
    return { propertyIds: [propertyId], isVirtual: true }
  }
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { properties: { select: { id: true } } },
  })
  if (!client) throw new Error("Client not found.")
  return {
    propertyIds: client.properties.map((p) => p.id),
    isVirtual: false,
  }
}

async function buildSnapshotForProperty(
  clientId: string,
  propertyId: string,
  month: number,
  year: number,
  bookingIds: string[],
  options?: { draftStatementId?: string | null }
): Promise<{
  snapshot: OwnerStatementSnapshotV1
  property: {
    name: string
    address: string
    city: string
    suburb: string | null
    ownerName: string | null
    commission: number | null
  }
}> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      name: true,
      address: true,
      city: true,
      suburb: true,
      right_stay_commission_percent: true,
      management_fee_type: true,
      welcome_pack_fee: true,
      client_id: true,
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

  const resolvedClientId =
    clientId.startsWith("property:") && property.client_id
      ? property.client_id
      : clientId.startsWith("property:")
        ? null
        : clientId

  const expenseRows =
    resolvedClientId != null
      ? await loadStatementExpenses(resolvedClientId, propertyId, month, year)
      : []
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds }, property_id: propertyId },
    select: bookingSelect,
  })

  if (bookings.length !== bookingIds.length) {
    throw new Error("One or more bookings were not found.")
  }

  for (const b of bookings) {
    if (!ACTIVE.has(b.status)) {
      throw new Error(`Booking "${b.guest_name}" is not active for statements.`)
    }
    if (!checkInAllowedOnOwnerStatement(b.check_in, year, month)) {
      throw new Error(
        `Booking "${b.guest_name}" check-in must fall in the statement month or the previous calendar month.`
      )
    }
    const draftId = options?.draftStatementId ?? null
    if (b.owner_statement_id != null && b.owner_statement_id !== draftId) {
      throw new Error(`Booking "${b.guest_name}" is already on another statement.`)
    }
  }

  const manualLines = [
    ...buildAutomaticExpenseManualLines(
      bookings.map((b) => ({
        id: b.id,
        guestName: b.guest_name,
        cleaningFee: Number(b.cleaning_fee ?? 0),
      })),
      welcomePack
    ),
    ...expensesToManualLines(expenseRows),
  ]

  const snapshotBookings = bookings.map(bookingToSnapshotRow)
  const snapshot = buildSnapshotV1({
    month,
    year,
    commissionPercentProperty: commissionProp,
    commissionPercentOverride: null,
    bookings: snapshotBookings,
    manualLines,
    receiptLines: [],
  })

  return {
    snapshot,
    property: {
      name: property.name,
      address: property.address,
      city: property.city,
      suburb: property.suburb,
      ownerName: property.owner?.full_name ?? null,
      commission: commissionProp,
    },
  }
}

async function syncBookingsToStatement(
  tx: Pick<typeof prisma, "booking">,
  propertyId: string,
  statementId: string,
  bookingIds: string[]
) {
  await tx.booking.updateMany({
    where: {
      property_id: propertyId,
      owner_statement_id: statementId,
      id: { notIn: bookingIds },
    },
    data: { owner_statement_id: null },
  })
  await tx.booking.updateMany({
    where: { id: { in: bookingIds }, property_id: propertyId },
    data: { owner_statement_id: statementId },
  })
}

export async function generatePropertyStatement(input: {
  clientId: string
  propertyId: string
  month: number
  year: number
  bookingIds?: string[]
  statementId?: string | null
}): Promise<{
  statementId: string
  snapshot: OwnerStatementSnapshotV1
  downloadName: string
  pdfBuffer: Buffer
}> {
  const { propertyIds } = await resolveClientPropertyIds(input.clientId)
  if (!propertyIds.includes(input.propertyId)) {
    throw new Error("Property does not belong to this client.")
  }

  const existingGenerated = await prisma.statement.findFirst({
    where: {
      property_id: input.propertyId,
      month: input.month,
      year: input.year,
      source: StatementSource.GENERATED,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      file_url: true,
      file_name: true,
    },
  })

  const allBookings = await prisma.booking.findMany({
    where: { property_id: input.propertyId, status: { in: [...ACTIVE] } },
    select: bookingSelect,
  })

  const bookingIds =
    input.bookingIds != null && input.bookingIds.length > 0
      ? input.bookingIds
      : selectBookingIdsForAutoGenerate(allBookings, input.year, input.month)

  if (bookingIds.length === 0) {
    throw new Error("Select at least one booking to include on the statement.")
  }

  const statementIdToUpdate =
    input.statementId ?? existingGenerated?.id ?? null

  const eligibleSet = new Set(
    bookingIdsEligibleForStatementSelection(
      allBookings,
      input.year,
      input.month,
      statementIdToUpdate
    )
  )
  for (const id of bookingIds) {
    if (!eligibleSet.has(id)) {
      throw new Error("One or more selected bookings are not eligible for this statement period.")
    }
  }

  if (
    existingGenerated?.status === StatementStatus.FINAL &&
    existingGenerated.file_url &&
    (input.bookingIds == null || input.bookingIds.length === 0)
  ) {
    throw new Error("Select bookings and use Update & download to change a finalized statement.")
  }

  const { snapshot, property } = await buildSnapshotForProperty(
    input.clientId,
    input.propertyId,
    input.month,
    input.year,
    bookingIds,
    { draftStatementId: statementIdToUpdate }
  )

  const buffer = await renderOwnerStatementPdf(snapshot, {
    propertyName: property.name,
    propertyAddressLine: [property.address, property.suburb, property.city]
      .filter(Boolean)
      .join(", "),
    ownerName: property.ownerName,
    isFinal: true,
  })

  const fileId = randomUUID()
  const storagePath = `properties/${input.propertyId}/statements/owner-statement_${input.year}-${String(input.month).padStart(2, "0")}_${fileId}.pdf`
  const safeSlug = property.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  const downloadName = `Owner-Statement_${input.year}-${String(input.month).padStart(2, "0")}_${safeSlug || "property"}.pdf`

  await uploadFile(
    STATEMENTS_BUCKET,
    storagePath,
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" })
  )

  const statementId = await prisma.$transaction(async (tx) => {
    if (statementIdToUpdate) {
      const row = await tx.statement.findFirst({
        where: {
          id: statementIdToUpdate,
          property_id: input.propertyId,
          source: StatementSource.GENERATED,
        },
      })
      if (!row) throw new Error("Statement not found.")

      await tx.statement.update({
        where: { id: statementIdToUpdate },
        data: {
          month: input.month,
          year: input.year,
          status: StatementStatus.FINAL,
          file_url: storagePath,
          file_name: downloadName,
          snapshot,
        },
      })
      await syncBookingsToStatement(tx, input.propertyId, statementIdToUpdate, bookingIds)
      return statementIdToUpdate
    }

    const created = await tx.statement.create({
      data: {
        property_id: input.propertyId,
        month: input.month,
        year: input.year,
        source: StatementSource.GENERATED,
        status: StatementStatus.FINAL,
        file_url: storagePath,
        file_name: downloadName,
        snapshot,
      },
    })
    await syncBookingsToStatement(tx, input.propertyId, created.id, bookingIds)
    return created.id
  })

  return { statementId, snapshot, downloadName, pdfBuffer: buffer }
}

export async function savePropertyStatementDraft(input: {
  clientId: string
  propertyId: string
  month: number
  year: number
  bookingIds: string[]
  statementId?: string | null
}): Promise<{ statementId: string }> {
  const { propertyIds } = await resolveClientPropertyIds(input.clientId)
  if (!propertyIds.includes(input.propertyId)) {
    throw new Error("Property does not belong to this client.")
  }

  if (input.clientId.startsWith("property:")) {
    throw new Error("Assign a client to this property before saving a statement draft.")
  }

  const existingGenerated = await prisma.statement.findFirst({
    where: {
      property_id: input.propertyId,
      month: input.month,
      year: input.year,
      source: StatementSource.GENERATED,
    },
    orderBy: { created_at: "desc" },
    select: { id: true, status: true },
  })

  const allBookings = await prisma.booking.findMany({
    where: { property_id: input.propertyId, status: { in: [...ACTIVE] } },
    select: bookingSelect,
  })

  if (input.bookingIds.length === 0) {
    throw new Error("Select at least one booking to include on the statement.")
  }

  let statementId = input.statementId ?? existingGenerated?.id ?? null
  if (statementId) {
    const row = await prisma.statement.findFirst({
      where: {
        id: statementId,
        property_id: input.propertyId,
        source: StatementSource.GENERATED,
      },
      select: { id: true, status: true },
    })
    if (!row) throw new Error("Statement not found.")
  } else {
    const existingDraft = await prisma.statement.findFirst({
      where: {
        property_id: input.propertyId,
        month: input.month,
        year: input.year,
        source: StatementSource.GENERATED,
        status: StatementStatus.DRAFT,
      },
      select: { id: true },
    })
    statementId = existingDraft?.id ?? null
  }

  const eligibleSet = new Set(
    bookingIdsEligibleForStatementSelection(
      allBookings,
      input.year,
      input.month,
      statementId
    )
  )
  for (const id of input.bookingIds) {
    if (!eligibleSet.has(id)) {
      throw new Error("One or more selected bookings are not eligible for this statement period.")
    }
  }

  const { snapshot } = await buildSnapshotForProperty(
    input.clientId,
    input.propertyId,
    input.month,
    input.year,
    input.bookingIds,
    { draftStatementId: statementId }
  )

  const monthLabel = new Date(input.year, input.month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
  const displayName = `Owner statement draft — ${monthLabel}`

  if (statementId) {
    await prisma.$transaction(async (tx) => {
      await tx.statement.update({
        where: { id: statementId },
        data: {
          month: input.month,
          year: input.year,
          status: StatementStatus.DRAFT,
          file_url: null,
          file_name: displayName,
          notes: null,
          snapshot,
        },
      })
      await syncBookingsToStatement(tx, input.propertyId, statementId, input.bookingIds)
    })
    return { statementId }
  }

  const created = await prisma.statement.create({
    data: {
      property_id: input.propertyId,
      month: input.month,
      year: input.year,
      source: StatementSource.GENERATED,
      status: StatementStatus.DRAFT,
      file_url: null,
      file_name: displayName,
      snapshot,
    },
  })

  await syncBookingsToStatement(prisma, input.propertyId, created.id, input.bookingIds)

  return { statementId: created.id }
}

export async function generateAllStatements(month: number, year: number) {
  const summaries = await loadClientsWithStatements(month, year)
  let generated = 0
  let skipped = 0
  const errors: string[] = []

  for (const client of summaries) {
    if (client.clientStatus === ClientStatus.ARCHIVED) continue
    for (const prop of client.properties) {
      if (prop.existingStatementStatus === StatementStatus.FINAL && prop.hasPdf) {
        skipped += 1
        continue
      }
      const eligible = filterBookingsForStatementMonth(
        await prisma.booking.findMany({
          where: { property_id: prop.propertyId, status: { in: [...ACTIVE] } },
          select: bookingSelect,
        }),
        year,
        month
      )
      if (eligible.length === 0) {
        skipped += 1
        continue
      }
      try {
        await generatePropertyStatement({
          clientId: client.clientId,
          propertyId: prop.propertyId,
          month,
          year,
        })
        generated += 1
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        errors.push(`${client.clientName} / ${prop.propertyName}: ${msg}`)
      }
    }
  }

  return { generated, skipped, errors }
}
