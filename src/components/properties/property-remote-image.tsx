"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PropertyRemoteImageProps = {
  src: string
  alt: string
  className?: string
  /** Applied to the Building2 icon when the image fails to load */
  fallbackIconClassName?: string
}

/**
 * Remote listing / Supabase photo URLs. Uses `referrerPolicy="no-referrer"` so OTAs and CDNs
 * that reject odd referrers (e.g. localhost) still load in dev and production.
 */
export function PropertyRemoteImage({
  src,
  alt,
  className,
  fallbackIconClassName = "size-8",
}: PropertyRemoteImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={cn("flex items-center justify-center bg-slate-200 text-slate-500", className)}
      >
        <Building2 className={cn("shrink-0", fallbackIconClassName)} aria-hidden />
        <span className="sr-only">Image unavailable</span>
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote property URLs
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
