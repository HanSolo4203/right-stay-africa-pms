import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyOverridesToAllocations } from "@/lib/clients/statement-booking-overrides"
import {
  allocationGrossRevenue,
  prorateBookingByMonth,
  type StatementBookingInput,
} from "@/lib/statement-calculator"

function booking(
  overrides: Partial<StatementBookingInput> & Pick<StatementBookingInput, "check_in" | "check_out">
): StatementBookingInput {
  return {
    id: "b1",
    guest_name: "Guest",
    channel_name: "Airbnb",
    source: "AIRBNB",
    status: "CONFIRMED",
    owner_statement_id: null,
    accommodation_total: { toString: () => "9000" },
    discount: { toString: () => "0" },
    extra_guest_charge: { toString: () => "0" },
    cleaning_fee: { toString: () => "300" },
    extra_charges: { toString: () => "0" },
    upsells: { toString: () => "0" },
    booking_taxes: { toString: () => "0" },
    commission: { toString: () => "900" },
    commission_tax: { toString: () => "0" },
    total_management_fee: { toString: () => "450" },
    payment_processing_fee: { toString: () => "0" },
    total_payout: { toString: () => "7650" },
    gross_revenue: { toString: () => "9300" },
    ...overrides,
  }
}

describe("prorateBookingByMonth", () => {
  it("returns a single full allocation for a one-month stay", () => {
    const allocations = prorateBookingByMonth(
      booking({
        check_in: new Date("2026-02-01T00:00:00.000Z"),
        check_out: new Date("2026-02-15T00:00:00.000Z"),
      })
    )
    assert.equal(allocations.length, 1)
    assert.equal(allocations[0].isProrated, false)
    assert.equal(allocations[0].nights, 14)
    assert.equal(allocations[0].total_payout, 7650)
  })

  it("splits a multi-month stay proportionally by nights", () => {
    const allocations = prorateBookingByMonth(
      booking({
        check_in: new Date("2026-02-01T00:00:00.000Z"),
        check_out: new Date("2026-04-30T00:00:00.000Z"),
      })
    )
    assert.ok(allocations.length > 1)
    assert.ok(allocations.every((a) => a.isProrated))
    const payoutSum = allocations.reduce((s, a) => s + a.total_payout, 0)
    assert.equal(payoutSum, 7650)
    const feb = allocations.find((a) => a.year === 2026 && a.month === 2)
    const apr = allocations.find((a) => a.year === 2026 && a.month === 4)
    assert.ok(feb)
    assert.ok(apr)
    assert.ok(feb!.total_payout > 0)
    assert.ok(apr!.total_payout > 0)
  })

  it("splits Feb–Apr 2026 stay into 28 + 31 + 30 nights (89 total)", () => {
    const allocations = prorateBookingByMonth(
      booking({
        check_in: new Date("2026-02-01T00:00:00.000Z"),
        check_out: new Date("2026-05-01T00:00:00.000Z"),
      })
    )
    const feb = allocations.find((a) => a.year === 2026 && a.month === 2)
    const mar = allocations.find((a) => a.year === 2026 && a.month === 3)
    const apr = allocations.find((a) => a.year === 2026 && a.month === 4)
    assert.equal(feb?.nights, 28)
    assert.equal(mar?.nights, 31)
    assert.equal(apr?.nights, 30)
    assert.equal(allocations.reduce((s, a) => s + a.nights, 0), 89)
  })

  it("bypasses pro-ration when manual override is set", () => {
    const allocations = prorateBookingByMonth(
      booking({
        check_in: new Date("2026-02-01T00:00:00.000Z"),
        check_out: new Date("2026-04-30T00:00:00.000Z"),
        is_manual_override: true,
      })
    )
    assert.equal(allocations.length, 1)
    assert.equal(allocations[0].isProrated, false)
    assert.equal(allocations[0].total_payout, 7650)
  })
})

describe("applyOverridesToAllocations", () => {
  it("uses override gross income without adding cleaning again", () => {
    const allocations = prorateBookingByMonth(
      booking({
        check_in: new Date("2026-01-27T00:00:00.000Z"),
        check_out: new Date("2026-02-28T00:00:00.000Z"),
        accommodation_total: { toString: () => "24154.52" },
        total_payout: { toString: () => "24154.52" },
        gross_revenue: { toString: () => "24604.52" },
      })
    )
    const jan = allocations.find((a) => a.year === 2026 && a.month === 1)
    assert.ok(jan)
    assert.ok(jan!.gross_revenue < 5000)

    const [merged] = applyOverridesToAllocations(
      [jan!],
      [
        {
          id: "ov1",
          booking_id: "b1",
          property_id: "p1",
          month: 1,
          year: 2026,
          note: "Manual override",
          accommodation_total: 24154.52,
          discount: 1130.63,
          extra_charges: null,
          cleaning_fee: 450,
          upsells: null,
          booking_taxes: null,
          channel_commission: 0,
          total_management_fee: 4227.04,
          payment_processing_fee: 0,
          total_payout: 24154.52,
        },
      ],
      1,
      2026
    )

    assert.equal(merged.isManualOverride, true)
    assert.equal(merged.gross_revenue, 24154.52)
    assert.equal(allocationGrossRevenue(merged), 24154.52)
    assert.equal(merged.cleaning_fee, 450)
  })
})
