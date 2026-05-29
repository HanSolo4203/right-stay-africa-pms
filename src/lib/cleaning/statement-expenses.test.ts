import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildScheduleCleaningExpenseLines } from "./statement-expenses"

describe("buildScheduleCleaningExpenseLines", () => {
  const selected = new Set(["booking-a"])

  it("includes mid-stay cleans for selected bookings", () => {
    const lines = buildScheduleCleaningExpenseLines(
      [
        {
          id: "task-1",
          type: "midstay",
          bookingId: "booking-a",
          guestName: "Jane Doe",
          scheduledDate: "2026-05-15",
          midstayOccurrence: 1,
          status: "scheduled",
        },
      ],
      { selectedBookingIds: selected, defaultUnitPrice: 450 }
    )
    assert.equal(lines.length, 1)
    assert.equal(lines[0]?.id, "schedule-clean:task-1")
    assert.match(lines[0]?.description ?? "", /Mid-stay clean #1 — Jane Doe/)
    assert.equal(lines[0]?.unitPrice, 450)
    assert.equal(lines[0]?.expenseCategory, "MID_STAY_CLEAN")
  })

  it("excludes mid-stay when booking is not on the statement", () => {
    const lines = buildScheduleCleaningExpenseLines(
      [
        {
          id: "task-2",
          type: "midstay",
          bookingId: "booking-other",
          guestName: "Other",
          scheduledDate: "2026-05-10",
          midstayOccurrence: 1,
          status: "scheduled",
        },
      ],
      { selectedBookingIds: selected }
    )
    assert.equal(lines.length, 0)
  })

  it("includes manual cleans without a booking", () => {
    const lines = buildScheduleCleaningExpenseLines(
      [
        {
          id: "task-3",
          type: "manual",
          bookingId: null,
          guestName: null,
          scheduledDate: "2026-05-20",
          midstayOccurrence: null,
          status: "completed",
        },
      ],
      { selectedBookingIds: selected, defaultUnitPrice: 300 }
    )
    assert.equal(lines.length, 1)
    assert.match(lines[0]?.description ?? "", /Manual clean/)
    assert.equal(lines[0]?.expenseCategory, "CLEANING")
  })

  it("skips skipped tasks", () => {
    const lines = buildScheduleCleaningExpenseLines(
      [
        {
          id: "task-4",
          type: "manual",
          bookingId: null,
          guestName: null,
          scheduledDate: "2026-05-21",
          midstayOccurrence: null,
          status: "skipped",
        },
      ],
      { selectedBookingIds: selected }
    )
    assert.equal(lines.length, 0)
  })
})
