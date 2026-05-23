import "server-only"

function formatThousandsSpaced(integerPart: string): string {
  const digits = integerPart.replace(/\D/g, "")
  if (digits.length <= 3) return digits
  const parts: string[] = []
  for (let i = digits.length; i > 0; i -= 3) {
    parts.unshift(digits.slice(Math.max(0, i - 3), i))
  }
  return parts.join(" ")
}

/** ZAR formatting — space thousands, comma decimals (CSV precision, no rounding). */
export function formatZAR(amount: number): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  if (abs === 0) return "R 0,00"
  const fixed = abs.toFixed(2)
  const [intPart, decPart] = fixed.split(".")
  const body = `${formatThousandsSpaced(intPart)},${decPart}`
  return neg ? `-R ${body}` : `R ${body}`
}

export function formatZARDeduction(amount: number): string {
  if (amount === 0) return formatZAR(0)
  return `(${formatZAR(Math.abs(amount))})`
}

/**
 * Compact ZAR for PDF table cells — no thousands spaces so react-pdf does not wrap mid-amount.
 * e.g. R13263,38
 */
export function formatZARTable(amount: number): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  if (abs === 0) return "R0,00"
  const fixed = abs.toFixed(2)
  const [intPart, decPart] = fixed.split(".")
  return neg ? `-R${intPart},${decPart}` : `R${intPart},${decPart}`
}

export function formatZARTableDeduction(amount: number): string {
  if (amount === 0) return "R0,00"
  return `(${formatZARTable(amount)})`
}
