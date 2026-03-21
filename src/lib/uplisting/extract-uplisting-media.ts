import type { UplistingIncludedResource } from "./client"

const HTTP_URL = /^https?:\/\//i

/** Keys that often hold listing images (arrays or nested objects). */
const MEDIA_ATTRIBUTE_KEYS = [
  "photos",
  "images",
  "gallery",
  "pictures",
  "listing_photos",
  "property_photos",
  "listing_images",
  "property_images",
  "photo_urls",
  "image_urls",
  "media",
  "attachments",
  "cover_photo",
  "hero_photo",
  "hero_image",
  "thumbnail",
  "main_photo",
  "primary_photo",
  "featured_image",
  "photo",
  "image",
]

const RELATIONSHIP_KEYS = [
  "photos",
  "images",
  "property_photos",
  "listing_photos",
  "media",
  "pictures",
  "attachments",
]

function collectHttpUrls(value: unknown, out: Set<string>, depth: number) {
  if (depth > 8) return
  if (typeof value === "string" && HTTP_URL.test(value)) {
    const trimmed = value.trim()
    if (
      trimmed &&
      !trimmed.toLowerCase().includes("favicon") &&
      !trimmed.toLowerCase().endsWith(".svg")
    ) {
      out.add(trimmed)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, out, depth + 1)
    return
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const preferredKeys = ["url", "src", "original_url", "large_url", "full_url", "photo_url", "image_url", "href"]
    for (const key of preferredKeys) {
      if (key in obj) collectHttpUrls(obj[key], out, depth + 1)
    }
    for (const v of Object.values(obj)) collectHttpUrls(v, out, depth + 1)
  }
}

function mergeUrlOrder(primary: string[], extra: Iterable<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of primary) {
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  for (const u of extra) {
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
}

function jsonApiRelationshipRefs(block: unknown): Array<{ type?: string; id: string }> {
  if (!block || typeof block !== "object") return []
  const data = (block as { data?: unknown }).data
  if (data == null) return []
  if (Array.isArray(data)) {
    return data.flatMap((item) =>
      item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? [{ type: (item as { type?: string }).type, id: (item as { id: string }).id }]
        : []
    )
  }
  if (typeof data === "object" && typeof (data as { id?: unknown }).id === "string") {
    return [{ type: (data as { type?: string }).type, id: (data as { id: string }).id }]
  }
  return []
}

/**
 * Resolve JSON:API relationship data[] to included resources and collect image URLs in list order.
 */
function urlsFromRelationships(
  relationships: Record<string, unknown> | undefined,
  included: UplistingIncludedResource[] | undefined
): string[] {
  if (!relationships || !included?.length) return []
  const ordered: string[] = []

  for (const key of RELATIONSHIP_KEYS) {
    const block = relationships[key]
    const refs = jsonApiRelationshipRefs(block)
    for (const ref of refs) {
      const resource = included.find(
        (r) => r.id === ref.id && (ref.type == null || r.type === ref.type)
      )
      if (!resource?.attributes) continue
      const found = new Set<string>()
      collectHttpUrls(resource.attributes, found, 0)
      for (const u of found) ordered.push(u)
    }
  }

  return ordered
}

function includedLooksLikeMedia(type: string): boolean {
  const t = type.toLowerCase()
  return (
    t.includes("photo") ||
    t.includes("image") ||
    t.includes("picture") ||
    t.includes("media") ||
    t.includes("attachment") ||
    t.includes("file") ||
    t.includes("asset")
  )
}

/**
 * Pulls image URLs from property attributes, JSON:API relationships → included, and `included` scans.
 */
export function extractUplistingPhotoUrls(
  attributes: Record<string, unknown>,
  included?: UplistingIncludedResource[],
  relationships?: Record<string, unknown>
): string[] {
  const fromRelationships = urlsFromRelationships(relationships, included)

  const fromAttributes = new Set<string>()
  for (const key of MEDIA_ATTRIBUTE_KEYS) {
    if (key in attributes) collectHttpUrls(attributes[key], fromAttributes, 0)
  }

  const fromIncluded = new Set<string>()
  for (const resource of included ?? []) {
    const t = resource.type ?? ""
    if (includedLooksLikeMedia(t) && resource.attributes) {
      collectHttpUrls(resource.attributes, fromIncluded, 0)
    }
  }

  return mergeUrlOrder(fromRelationships, [...fromAttributes, ...fromIncluded])
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

/** Best-effort address fields from Uplisting attributes (keys vary by account/API version). */
export function extractLocationFromUplistingAttributes(attrs: Record<string, unknown>): {
  address?: string
  city?: string
  suburb?: string
} {
  const address = firstNonEmptyString(
    attrs.address,
    attrs.street_address,
    attrs.street,
    attrs.line_1,
    attrs.line1,
    attrs.full_address,
    attrs.address_line_1,
    attrs.address_line1,
    attrs.route,
    attrs.street_name
  )
  const city = firstNonEmptyString(attrs.city, attrs.town, attrs.locality, attrs.region)
  const suburb = firstNonEmptyString(
    attrs.suburb,
    attrs.neighborhood,
    attrs.neighbourhood,
    attrs.area,
    attrs.district,
    attrs.sublocality
  )
  return { address, city, suburb }
}

function formatMinutesFromMidnight(minutes: unknown): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) return null
  const h = Math.floor(minutes / 60) % 24
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Supplementary listing metadata for InfoGuide.notes on first import. */
export function buildUplistingInfoGuideNotes(attrs: Record<string, unknown>): string | null {
  const lines: string[] = []

  const checkIn = formatMinutesFromMidnight(attrs.check_in_time)
  const checkOut = formatMinutesFromMidnight(attrs.check_out_time)
  if (checkIn) lines.push(`Check-in from: ${checkIn}`)
  if (checkOut) lines.push(`Check-out by: ${checkOut}`)

  if (typeof attrs.maximum_capacity === "number" && Number.isFinite(attrs.maximum_capacity)) {
    lines.push(`Maximum guests: ${attrs.maximum_capacity}`)
  }
  if (typeof attrs.currency === "string" && attrs.currency.trim()) {
    lines.push(`Currency: ${attrs.currency.trim()}`)
  }
  if (typeof attrs.time_zone === "string" && attrs.time_zone.trim()) {
    lines.push(`Time zone: ${attrs.time_zone.trim()}`)
  }
  if (typeof attrs.property_slug === "string" && attrs.property_slug.trim()) {
    lines.push(`Uplisting slug: ${attrs.property_slug.trim()}`)
  }

  if (lines.length === 0) return null
  return lines.join("\n")
}

export function extractUnitAndBuilding(attrs: Record<string, unknown>): {
  unit_number?: string
  building_name?: string
} {
  const unit_number = firstNonEmptyString(
    attrs.unit_number,
    attrs.unit,
    attrs.apartment_number,
    attrs.apartment,
    attrs.suite,
    attrs.flat_number
  )
  const building_name = firstNonEmptyString(
    attrs.building_name,
    attrs.building,
    attrs.complex_name,
    attrs.estate_name
  )
  return { unit_number, building_name }
}
