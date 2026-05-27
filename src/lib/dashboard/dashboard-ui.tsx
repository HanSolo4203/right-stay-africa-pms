import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns"
import { cn } from "@/lib/utils"

export const PROPERTY_DETAIL_PATH = (propertyId: string) =>
  `/dashboard/properties/${propertyId}` as const

export function formatUpcomingDate(iso: string, ref: Date = new Date()): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const today = startOfDay(ref)
  const target = startOfDay(d)
  if (isSameDay(target, today)) return "Today"
  if (isSameDay(target, addDays(today, 1))) return "Tomorrow"
  return format(d, "EEE d MMM")
}

type PlatformBadgePlatform = "Airbnb" | "Booking.com" | "Direct" | string

const PLATFORM_BADGE_CLASS: Record<string, string> = {
  Airbnb: "bg-[#fff0f0] text-[#c41e3a]",
  "Booking.com": "bg-[#f0f4ff] text-[#003580]",
  Direct: "bg-[#f0faf4] text-[#1a5c35]",
}

export function platformBadgeClass(platform: string): string {
  if (PLATFORM_BADGE_CLASS[platform]) return PLATFORM_BADGE_CLASS[platform]
  const lower = platform.toLowerCase()
  if (lower.includes("airbnb")) return PLATFORM_BADGE_CLASS.Airbnb
  if (lower.includes("booking")) return PLATFORM_BADGE_CLASS["Booking.com"]
  if (lower.includes("direct")) return PLATFORM_BADGE_CLASS.Direct
  return "bg-slate-100 text-slate-600 dark:bg-[rgba(148,163,184,0.15)] dark:text-slate-400"
}

export function PlatformBadge({ platform }: { platform: PlatformBadgePlatform }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
        platformBadgeClass(platform)
      )}
    >
      {platform}
    </span>
  )
}

export function formatLastUpdated(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Not updated yet"
  const then = parseISO(iso)
  if (Number.isNaN(then.getTime())) return "Just now"
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "Just now"
  if (diffMin === 1) return "Last updated 1 minute ago"
  if (diffMin < 60) return `Last updated ${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return "Last updated 1 hour ago"
  return `Last updated ${diffHr} hours ago`
}

export function OccupancyMiniBar({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.max(0, rate))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
        <div
          className="h-1.5 rounded-full bg-[var(--spike-accent-green)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums spike-text-secondary">
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

export type PropertyStatusKind = "occupied" | "vacant" | "check-in" | "check-out"

const STATUS_BADGE: Record<PropertyStatusKind, string> = {
  occupied: "bg-[rgba(48,209,88,0.18)] text-[var(--spike-accent-green)]",
  vacant: "bg-[rgba(148,163,184,0.15)] text-slate-400",
  "check-in": "bg-[rgba(255,159,10,0.15)] text-[#ff9f0a]",
  "check-out": "bg-[rgba(90,200,250,0.15)] text-[var(--spike-primary)]",
}

const STATUS_LABEL: Record<PropertyStatusKind, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  "check-in": "Check-in",
  "check-out": "Check-out",
}

export function PropertyStatusBadge({ status }: { status: PropertyStatusKind }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_BADGE[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
