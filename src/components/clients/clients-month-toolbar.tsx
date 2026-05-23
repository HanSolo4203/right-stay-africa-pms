"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

type ClientsMonthToolbarProps = {
  month: number
  year: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  trailing?: ReactNode
}

export function ClientsMonthToolbar({
  month,
  year,
  onMonthChange,
  onYearChange,
  trailing,
}: ClientsMonthToolbarProps) {
  const now = new Date()
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((label, i) => (
              <SelectItem key={label} value={String(i + 1)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {trailing}
    </div>
  )
}

export function ClientsMonthToolbarButton({
  loading,
  label,
  onClick,
}: {
  loading?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button type="button" variant="outline" disabled={loading} onClick={onClick}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  )
}
