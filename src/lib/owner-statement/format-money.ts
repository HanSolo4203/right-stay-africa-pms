export function formatMoneyZar(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(amount)
}

/** PDF-safe currency: non-breaking spaces so amounts stay on one line in tables. */
export function formatMoneyZarPdf(amount: number): string {
  return formatMoneyZar(amount).replace(/ /g, "\u00A0")
}

export function formatMoneyZarPdfOrDash(amount: number, showWhenZero = false): string {
  if (!showWhenZero && amount === 0) return "—"
  return formatMoneyZarPdf(amount)
}

export function formatMoneyZarPdfNegative(amount: number): string {
  if (amount === 0) return "—"
  return formatMoneyZarPdf(-Math.abs(amount))
}

function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

function formatStatementPeriodDate(date: Date): string {
  const month = date.toLocaleString("en-ZA", { month: "long" })
  return `${ordinalDay(date.getDate())} ${month} ${date.getFullYear()}`
}

/** Full calendar month range, e.g. "1st May 2026 – 31st May 2026". */
export function formatStatementPeriod(month: number, year: number): string {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return `${formatStatementPeriodDate(start)} – ${formatStatementPeriodDate(end)}`
}

export function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
