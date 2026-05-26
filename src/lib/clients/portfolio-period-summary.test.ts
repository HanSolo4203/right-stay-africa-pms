import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  classifyExpenseLine,
  expenseServiceFeeAmount,
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
