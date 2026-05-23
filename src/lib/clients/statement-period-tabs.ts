import {
  nextCalendarMonth,
  previousCalendarMonth,
} from "@/lib/owner-statement/statement-eligibility"

export type StatementPeriodTab = "previous" | "current" | "future"

export function calendarMonthYearNow(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function periodTabToMonthYear(tab: StatementPeriodTab): { month: number; year: number } {
  const { month, year } = calendarMonthYearNow()
  switch (tab) {
    case "previous":
      return previousCalendarMonth(year, month)
    case "future":
      return nextCalendarMonth(year, month)
    case "current":
    default:
      return { month, year }
  }
}

export function isStatementPeriodTab(value: string | null): value is StatementPeriodTab {
  return value === "previous" || value === "current" || value === "future"
}

/** Last calendar day of the statement month (en-ZA). */
export function statementPeriodEndLabel(month: number, year: number): string {
  const end = new Date(year, month, 0)
  return end.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatPeriodTabLabel(tab: StatementPeriodTab): string {
  const { month, year } = periodTabToMonthYear(tab)
  return new Date(year, month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}
