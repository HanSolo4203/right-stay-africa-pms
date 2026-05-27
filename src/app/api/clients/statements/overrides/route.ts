import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { normalizeBookingOverrideAmounts } from "@/lib/clients/normalize-booking-override-amounts"
import { parseManagementFeeType } from "@/lib/clients/management-fee-calculator"
import {
  FULL_PAYMENT_OVERRIDE_NOTE,
  fullPaymentOverrideAmounts,
  serializeStatementBookingOverride,
} from "@/lib/clients/statement-booking-overrides"
import {
  rebuildPropertyStatementForPeriod,
  resolveClientPropertyIds,
} from "@/lib/clients/statement-service"
import { upsertStatementBookingOverrideSchema } from "@/lib/validations/statement-booking-override"
import { statementBookingSelect } from "@/lib/statement-calculator"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = upsertStatementBookingOverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const data = parsed.data

  if (data.clientId.startsWith("property:")) {
    return NextResponse.json(
      { error: "Assign a client to this property before saving overrides." },
      { status: 400 }
    )
  }

  try {
    const { propertyIds } = await resolveClientPropertyIds(data.clientId)
    if (!propertyIds.includes(data.propertyId)) {
      return NextResponse.json({ error: "Property does not belong to this client." }, { status: 400 })
    }

    const property = await prisma.property.findFirst({
      where: { id: data.propertyId },
      select: {
        right_stay_commission_percent: true,
        management_fee_type: true,
      },
    })
    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 })
    }

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, property_id: data.propertyId },
      select: statementBookingSelect,
    })
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 })
    }

    const commissionPercent =
      property.right_stay_commission_percent != null
        ? Number(property.right_stay_commission_percent)
        : null
    const managementFeeType = parseManagementFeeType(property.management_fee_type)

    if (data.allocationMode === "prorated") {
      await prisma.statementBookingOverride.deleteMany({
        where: {
          booking_id: data.bookingId,
          property_id: data.propertyId,
          month: data.month,
          year: data.year,
        },
      })
    } else if (data.allocationMode === "full_payment") {
      const amounts = fullPaymentOverrideAmounts(booking)

      await prisma.statementBookingOverride.upsert({
        where: {
          booking_id_month_year: {
            booking_id: data.bookingId,
            month: data.month,
            year: data.year,
          },
        },
        create: {
          booking_id: data.bookingId,
          property_id: data.propertyId,
          month: data.month,
          year: data.year,
          allocation_mode: "FULL_PAYMENT",
          note: FULL_PAYMENT_OVERRIDE_NOTE,
          accommodation_total: amounts.accommodation_total,
          channel_commission: amounts.channel_commission,
          total_management_fee: amounts.total_management_fee,
          cleaning_fee: amounts.cleaning_fee,
          payment_processing_fee: amounts.payment_processing_fee,
          total_payout: amounts.total_payout,
          discount: amounts.discount,
          extra_charges: amounts.extra_charges,
          upsells: amounts.upsells,
          booking_taxes: amounts.booking_taxes,
        },
        update: {
          allocation_mode: "FULL_PAYMENT",
          note: FULL_PAYMENT_OVERRIDE_NOTE,
          accommodation_total: amounts.accommodation_total,
          channel_commission: amounts.channel_commission,
          total_management_fee: amounts.total_management_fee,
          cleaning_fee: amounts.cleaning_fee,
          payment_processing_fee: amounts.payment_processing_fee,
          total_payout: amounts.total_payout,
          discount: amounts.discount,
          extra_charges: amounts.extra_charges,
          upsells: amounts.upsells,
          booking_taxes: amounts.booking_taxes,
        },
      })
    } else {
      const amounts = normalizeBookingOverrideAmounts({
        accommodation_total: data.accommodation_total,
        channel_commission: data.channel_commission,
        total_management_fee: data.total_management_fee,
        cleaning_fee: data.cleaning_fee,
        payment_processing_fee: data.payment_processing_fee,
        total_payout: data.total_payout,
        discount: data.discount,
        extra_charges: data.extra_charges,
        upsells: data.upsells,
        booking_taxes: data.booking_taxes,
        commissionPercent,
        managementFeeType,
      })

      await prisma.statementBookingOverride.upsert({
        where: {
          booking_id_month_year: {
            booking_id: data.bookingId,
            month: data.month,
            year: data.year,
          },
        },
        create: {
          booking_id: data.bookingId,
          property_id: data.propertyId,
          month: data.month,
          year: data.year,
          allocation_mode: "MANUAL",
          note: data.note!.trim(),
          accommodation_total: amounts.accommodation_total,
          channel_commission: amounts.channel_commission,
          total_management_fee: amounts.total_management_fee,
          cleaning_fee: amounts.cleaning_fee,
          payment_processing_fee: amounts.payment_processing_fee,
          total_payout: amounts.total_payout,
          discount: amounts.discount,
          extra_charges: amounts.extra_charges,
          upsells: amounts.upsells,
          booking_taxes: amounts.booking_taxes,
        },
        update: {
          allocation_mode: "MANUAL",
          note: data.note!.trim(),
          accommodation_total: amounts.accommodation_total,
          channel_commission: amounts.channel_commission,
          total_management_fee: amounts.total_management_fee,
          cleaning_fee: amounts.cleaning_fee,
          payment_processing_fee: amounts.payment_processing_fee,
          total_payout: amounts.total_payout,
          discount: amounts.discount,
          extra_charges: amounts.extra_charges,
          upsells: amounts.upsells,
          booking_taxes: amounts.booking_taxes,
        },
      })
    }

    const statement = await rebuildPropertyStatementForPeriod(
      data.clientId,
      data.propertyId,
      data.month,
      data.year
    )

    const overrides = await prisma.statementBookingOverride.findMany({
      where: { property_id: data.propertyId, month: data.month, year: data.year },
    })

    return NextResponse.json({
      statement,
      overrides: overrides.map(serializeStatementBookingOverride),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save override."
    console.error("[clients/statements/overrides POST]", e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
