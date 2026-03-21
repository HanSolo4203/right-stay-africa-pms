const UPLISTING_BASE_URL = "https://connect.uplisting.io"

type JsonApiResource<TAttributes extends Record<string, unknown>> = {
  id: string
  type: string
  attributes: TAttributes
}

type JsonApiResponse<TAttributes extends Record<string, unknown>> = {
  data: JsonApiResource<TAttributes> | Array<JsonApiResource<TAttributes>>
}

type UplistingPropertyAttributes = {
  name?: string
  nickname?: string
  type?: string
  maximum_capacity?: number
  bedrooms_count?: number
  bathrooms_count?: number
  description?: string
  check_in_time?: number
  check_out_time?: number
  property_slug?: string
  currency?: string
  time_zone?: string
}

type UplistingBookingAttributes = {
  property_id?: string | number
  check_in?: string
  check_out?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  source?: string
  status?: string
  total_price?: number | string
  currency?: string
}

export type UplistingPropertyRecord = {
  uplisting_id: string
  name: string | null
  nickname: string | null
  property_type: string | null
  maximum_capacity: number | null
  bedrooms_count: number | null
  bathrooms_count: number | null
  description: string | null
  check_in_time: number | null
  check_out_time: number | null
  property_slug: string | null
  currency: string | null
  time_zone: string | null
  raw_payload: Record<string, unknown>
}

export type UplistingBookingRecord = {
  uplisting_id: string
  uplisting_property_id: string | null
  check_in: Date | null
  check_out: Date | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  source: string | null
  status: string | null
  total_price: string | null
  currency: string | null
  raw_payload: Record<string, unknown>
}

export class UplistingRateLimitError extends Error {
  readonly status: number

  constructor(message = "Uplisting API rate limit exceeded.") {
    super(message)
    this.name = "UplistingRateLimitError"
    this.status = 429
  }
}

function getUplistingAuthHeader() {
  const apiKey = process.env.UPLISTING_API_KEY
  if (!apiKey) {
    throw new Error("UPLISTING_API_KEY is not set.")
  }

  return `Basic ${Buffer.from(apiKey).toString("base64")}`
}

async function fetchUplisting<TAttributes extends Record<string, unknown>>(
  endpoint: string
): Promise<Array<JsonApiResource<TAttributes>>> {
  try {
    const response = await fetch(`${UPLISTING_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: getUplistingAuthHeader(),
        Accept: "application/vnd.api+json, application/json",
      },
      cache: "no-store",
    })

    if (response.status === 429) {
      console.warn(`[uplisting] Rate limit when calling ${endpoint}`)
      throw new UplistingRateLimitError()
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Uplisting request failed (${response.status}): ${text || "Unknown error"}`)
    }

    const payload = (await response.json()) as JsonApiResponse<TAttributes>
    if (!payload || !payload.data) return []

    return Array.isArray(payload.data) ? payload.data : [payload.data]
  } catch (error) {
    if (error instanceof UplistingRateLimitError) {
      throw error
    }

    const message = error instanceof Error ? error.message : "Unknown Uplisting fetch error."
    throw new Error(`Failed to fetch from Uplisting: ${message}`)
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function mapUplistingProperty(
  resource: JsonApiResource<UplistingPropertyAttributes>
): UplistingPropertyRecord {
  const attrs = resource.attributes ?? {}
  return {
    uplisting_id: resource.id,
    name: asString(attrs.name),
    nickname: asString(attrs.nickname),
    property_type: asString(attrs.type),
    maximum_capacity: asNumber(attrs.maximum_capacity),
    bedrooms_count: asNumber(attrs.bedrooms_count),
    bathrooms_count: asNumber(attrs.bathrooms_count),
    description: asString(attrs.description),
    check_in_time: asNumber(attrs.check_in_time),
    check_out_time: asNumber(attrs.check_out_time),
    property_slug: asString(attrs.property_slug),
    currency: asString(attrs.currency),
    time_zone: asString(attrs.time_zone),
    raw_payload: {
      id: resource.id,
      type: resource.type,
      attributes: attrs,
    },
  }
}

export function mapUplistingBooking(
  resource: JsonApiResource<UplistingBookingAttributes>
): UplistingBookingRecord {
  const attrs = resource.attributes ?? {}
  return {
    uplisting_id: resource.id,
    uplisting_property_id:
      typeof attrs.property_id === "string" || typeof attrs.property_id === "number"
        ? String(attrs.property_id)
        : null,
    check_in: asDate(attrs.check_in),
    check_out: asDate(attrs.check_out),
    guest_name: asString(attrs.guest_name),
    guest_email: asString(attrs.guest_email),
    guest_phone: asString(attrs.guest_phone),
    source: asString(attrs.source),
    status: asString(attrs.status),
    total_price: attrs.total_price === undefined || attrs.total_price === null ? null : String(attrs.total_price),
    currency: asString(attrs.currency),
    raw_payload: {
      id: resource.id,
      type: resource.type,
      attributes: attrs,
    },
  }
}

export async function fetchUplistingProperties() {
  const resources = await fetchUplisting<UplistingPropertyAttributes>("/properties")
  return resources.map(mapUplistingProperty)
}

export async function fetchUplistingBookings() {
  const resources = await fetchUplisting<UplistingBookingAttributes>("/bookings")
  return resources.map(mapUplistingBooking)
}

export type WebhookPayload =
  | {
      data?: JsonApiResource<Record<string, unknown>> | Array<JsonApiResource<Record<string, unknown>>>
    }
  | null
  | undefined

export function normalizeWebhookResources(payload: WebhookPayload) {
  const data = payload?.data
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}
