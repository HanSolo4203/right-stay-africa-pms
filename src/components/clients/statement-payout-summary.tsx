"use client"

import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { PropertyStatement } from "@/types/statement"

function WaterfallRow({
  label,
  amount,
  variant = "deduction",
  bold,
}: {
  label: string
  amount: number
  variant?: "base" | "deduction" | "subtotal" | "total" | "reference"
  bold?: boolean
}) {
  const amountClass =
    variant === "total"
      ? "text-xl font-bold text-emerald-800"
      : variant === "subtotal"
        ? "font-semibold text-slate-900"
        : variant === "base"
          ? "font-semibold text-slate-900"
          : variant === "reference"
            ? "text-slate-500"
            : "text-slate-700"

  const prefix =
    variant === "deduction" ? "−" : variant === "reference" ? "" : ""

  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        variant === "total"
          ? "mt-1 border-t-2 border-emerald-200 pt-4"
          : variant === "subtotal"
            ? "border-t border-slate-200"
            : ""
      }`}
    >
      <span
        className={`text-sm ${bold || variant === "total" || variant === "subtotal" ? "font-semibold text-slate-900" : "text-slate-600"}`}
      >
        {label}
      </span>
      <span className={`tabular-nums ${amountClass}`}>
        {prefix}
        {formatMoneyZar(Math.abs(amount))}
      </span>
    </div>
  )
}

export function StatementPayoutSummary({
  statement,
  periodLabel,
  selectedBookingCount,
}: {
  statement: PropertyStatement
  periodLabel: string
  selectedBookingCount: number
}) {
  const t = statement.totals
  const pct = statement.managementFeePercent
  const mgmtLabel =
    statement.managementFeeType === "percentage" && pct != null
      ? `Management fee (${pct}%)`
      : "Management fee"

  let step = 0
  const nextStep = () => {
    step += 1
    return step
  }

  return (
    <section className="rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white shadow-sm">
      <div className="border-b border-emerald-100/80 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
          Step 1 — Statement summary
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
          Owner payout · {periodLabel}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {selectedBookingCount === 0
            ? "Select bookings below to calculate this statement."
            : `${selectedBookingCount} booking${selectedBookingCount === 1 ? "" : "s"} included`}
          {statement.propertyName ? ` · ${statement.propertyName}` : ""}
        </p>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <ol className="list-none space-y-0">
          <li>
            <WaterfallRow label={`${nextStep()}. Gross revenue`} amount={t.grossRevenue} variant="base" />
          </li>
          <li>
            <WaterfallRow
              label={`${nextStep()}. Booking fees (OTA)`}
              amount={t.totalBookingFees}
              variant="deduction"
            />
          </li>
          <li>
            <WaterfallRow
              label={`${nextStep()}. ${mgmtLabel}`}
              amount={t.totalManagementFees}
              variant="deduction"
            />
          </li>
          <li>
            <WaterfallRow
              label={`${nextStep()}. Additional expenses`}
              amount={t.additionalExpensesTotal}
              variant="deduction"
            />
          </li>
        </ol>

        <WaterfallRow label="Owner payout" amount={t.netToOwner} variant="total" />

        <div className="mt-3 space-y-1 text-xs text-slate-500">
          {t.totalDiscount > 0 ? (
            <p>
              Guest discounts {formatMoneyZar(t.totalDiscount)} (shown in booking table; already in
              OTA payouts).
            </p>
          ) : null}
          {t.totalBookingsPayout > 0 ? (
            <p>OTA bookings payout (reference): {formatMoneyZar(t.totalBookingsPayout)}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
