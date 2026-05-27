import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  classifyExpenseLine,
  computePortfolioOccupancySummary,
  computePortfolioPayoutSplit,
  expenseServiceFeeAmount,
  propertyOccupancyRatePct,
  rightStayIncomeFromExpenseLine,
} from "./portfolio-period-summary"
import type { OwnerStatementExpenseComputed } from "@/lib/owner-statement/types"

function line(
  partial: Partial<OwnerStatementExpenseComputed> & Pick<OwnerStatementExpenseComputed, "key" | "label">
): OwnerStatementExpenseComputed {
  return {
    baseAmount: partial.baseAmount ?? 100,
    addTenPercent: partial.addTenPercent ?? false,
    chargedAmount: partial.chargedAmount ?? 100,
    quantity: partial.quantity ?? 1,
    unitPrice: partial.unitPrice ?? 100,
    ...partial,
  }
}

describe("classifyExpenseLine", () => {
  it("classifies cleaning by id prefix", () => {
    const cat = classifyExpenseLine(line({ key: "m:cleaning:abc", label: "Cleaning fee — Guest" }))
    assert.equal(cat, "cleaning")
  })

  it("classifies welcome pack by id prefix", () => {
    const cat = classifyExpenseLine(line({ key: "m:welcome-pack:abc", label: "Welcome pack" }))
    assert.equal(cat, "welcome_pack")
  })

  it("classifies mid-stay from description", () => {
    const cat = classifyExpenseLine(line({ key: "m:manual-1", label: "Mid-stay clean — Unit 2" }))
    assert.equal(cat, "mid_stay_clean")
  })

  it("classifies utilities from category", () => {
    const cat = classifyExpenseLine(line({ key: "m:e1", label: "Power" }), "UTILITIES")
    assert.equal(cat, "electricity")
  })
})

describe("rightStayIncomeFromExpenseLine", () => {
  it("uses full charged amount for cleaning", () => {
    const l = line({
      key: "m:cleaning:x",
      label: "Cleaning",
      chargedAmount: 250,
      baseAmount: 250,
    })
    assert.equal(rightStayIncomeFromExpenseLine(l, "cleaning"), 250)
  })

  it("uses service fee only for maintenance with +10%", () => {
    const l = line({
      key: "m:e1",
      label: "Maintenance",
      baseAmount: 100,
      chargedAmount: 110,
      addTenPercent: true,
    })
    assert.equal(expenseServiceFeeAmount(l), 10)
    assert.equal(rightStayIncomeFromExpenseLine(l, "maintenance"), 10)
  })
})

describe("computePortfolioOccupancySummary", () => {
  it("computes group occupancy across all properties", () => {
    const result = computePortfolioOccupancySummary({
      bookedNights: 15,
      totalProperties: 3,
      daysInMonth: 30,
      propertiesWithData: 2,
    })
    assert.equal(result.availableNights, 90)
    assert.equal(result.occupancyRatePct, 16.67)
  })
})

describe("computePortfolioPayoutSplit", () => {
  it("splits owner and RSA percentages", () => {
    const split = computePortfolioPayoutSplit(7500, 2500)
    assert.equal(split.totalDistributed, 10000)
    assert.equal(split.ownerPct, 75)
    assert.equal(split.rsaPct, 25)
  })
})

describe("propertyOccupancyRatePct", () => {
  it("returns percentage for a single property", () => {
    assert.equal(propertyOccupancyRatePct(15, 30), 50)
  })
})
