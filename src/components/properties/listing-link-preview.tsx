"use client"

import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export type ListingChannel = "airbnb" | "booking"

const channelMeta: Record<
  ListingChannel,
  { label: string; faviconDomain: string; gradient: string; accent: string }
> = {
  airbnb: {
    label: "Airbnb listing",
    faviconDomain: "airbnb.com",
    gradient: "from-rose-500 via-rose-600 to-rose-800",
    accent: "text-rose-100",
  },
  booking: {
    label: "Booking.com listing",
    faviconDomain: "booking.com",
    gradient: "from-sky-600 via-blue-700 to-indigo-900",
    accent: "text-sky-100",
  },
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

function truncateUrl(url: string, max = 52) {
  if (url.length <= max) return url
  return `${url.slice(0, max - 1)}…`
}

type ListingLinkPreviewProps = {
  url: string
  channel: ListingChannel
  className?: string
}

export function ListingLinkPreview({ url, channel, className }: ListingLinkPreviewProps) {
  const trimmed = url.trim()
  if (!trimmed) return null

  let hostname = ""
  try {
    hostname = new URL(trimmed).hostname
  } catch {
    return null
  }

  const meta = channelMeta[channel]

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br",
          meta.gradient
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl(meta.faviconDomain)}
          alt=""
          width={56}
          height={56}
          className="size-14 rounded-xl bg-white/95 p-2 shadow-md ring-1 ring-black/5"
        />
        <ExternalLink
          className={cn(
            "absolute right-3 top-3 size-4 opacity-80 transition group-hover:opacity-100",
            meta.accent
          )}
          aria-hidden
        />
      </div>
      <div className="space-y-1 p-3">
        <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
        <p className="truncate text-xs text-slate-500" title={trimmed}>
          {hostname}
        </p>
        <p className="break-all text-xs leading-snug text-slate-400">{truncateUrl(trimmed)}</p>
      </div>
    </a>
  )
}
