const DEFAULT_UPLISTING_BASE_URL = "https://connect.uplisting.io"
const PAGE_DELAY_MS = 500

export interface UplistingPropertyAttributes {
  name: string
  nickname: string | null
  type: string
  maximum_capacity: number
  bedrooms_count: number
  bathrooms_count: number
  description: string | null
  check_in_time: number
  check_out_time: number
  property_slug: string
  currency: string
  time_zone: string
}

export interface UplistingProperty {
  id: string
  type: "properties"
  attributes: UplistingPropertyAttributes
}

/** JSON:API single resource wrapper (may include related media in `included`). */
export type UplistingIncludedResource = {
  id: string
  type: string
  attributes?: Record<string, unknown>
}

export type UplistingPropertyPayloadDocument = {
  data: {
    id: string
    type: string
    attributes: Record<string, unknown>
    /** JSON:API links to side-loaded `included` resources (e.g. listing photos). */
    relationships?: Record<string, unknown>
  }
  included?: UplistingIncludedResource[]
}

export function toUplistingProperty(
  data: UplistingPropertyPayloadDocument["data"]
): UplistingProperty {
  return {
    id: data.id,
    type: "properties",
    attributes: data.attributes as unknown as UplistingPropertyAttributes,
  }
}

export interface UplistingBookingAttributes {
  check_in: string
  check_out: string
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  source: string
  status: string
  total_price: number | null
  currency: string
  adults: number
  property_id: string
  created_at: string
  updated_at: string
}

export interface UplistingBooking {
  id: string
  type: "bookings"
  attributes: UplistingBookingAttributes
}

export interface UplistingListResponse<T> {
  data: T[]
  meta?: { total_count?: number; page?: number; per_page?: number }
}

export interface UplistingSingleResponse<T> {
  data: T
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getBaseUrl() {
  return process.env.UPLISTING_BASE_URL?.trim() || DEFAULT_UPLISTING_BASE_URL
}

function getAuthHeaderValue() {
  const apiKey = process.env.UPLISTING_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Uplisting API key is invalid or missing")
  }

  return `Basic ${Buffer.from(apiKey).toString("base64")}`
}

async function readErrorBody(response: Response) {
  try {
    return await response.text()
  } catch {
    return ""
  }
}

export async function uplistingFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const requestPath = path.startsWith("/") ? path : `/${path}`
  const url = `${getBaseUrl()}${requestPath}`

  const headers = new Headers(options.headers)
  headers.set("Authorization", getAuthHeaderValue())
  headers.set("Content-Type", "application/json")
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.api+json, application/json")
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  })

  if (typeof window === "undefined") {
    console.info(`[uplisting] ${requestPath} -> ${response.status}`)
  }

  if (response.status === 401) {
    throw new Error("Uplisting API key is invalid or missing")
  }

  if (response.status === 429) {
    throw new Error("RATE_LIMITED: Too many requests to Uplisting API. Try again later.")
  }

  if (response.status === 404) {
    throw new Error("Uplisting resource not found")
  }

  if (![200, 201, 202].includes(response.status)) {
    const body = await readErrorBody(response)
    throw new Error(`Uplisting API error ${response.status}: ${body || "Unknown error"}`)
  }

  return (await response.json()) as T
}

export async function fetchAllProperties(): Promise<UplistingProperty[]> {
  const response = await uplistingFetch<UplistingListResponse<UplistingProperty>>("/properties")
  return response.data
}

export async function fetchPropertyPayload(
  uplistingId: string
): Promise<UplistingPropertyPayloadDocument> {
  const id = encodeURIComponent(uplistingId)
  const basePath = `/properties/${id}`
  // JSON:API: side-load gallery resources when supported (otherwise many listings only return a subset in attributes).
  const include = "photos,images,property_photos,listing_photos,media,pictures"
  try {
    return await uplistingFetch<UplistingPropertyPayloadDocument>(
      `${basePath}?include=${encodeURIComponent(include)}`
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes(" 400")) {
      return uplistingFetch<UplistingPropertyPayloadDocument>(basePath)
    }
    throw e
  }
}

export async function fetchProperty(uplistingId: string): Promise<UplistingProperty> {
  const doc = await fetchPropertyPayload(uplistingId)
  return toUplistingProperty(doc.data)
}

export async function fetchAllBookings(params?: {
  from?: string
  to?: string
}): Promise<UplistingBooking[]> {
  const bookings: UplistingBooking[] = []
  let page = 1

  while (true) {
    const query = new URLSearchParams()
    query.set("page", String(page))
    if (params?.from) query.set("from", params.from)
    if (params?.to) query.set("to", params.to)

    const response = await uplistingFetch<UplistingListResponse<UplistingBooking>>(
      `/bookings?${query.toString()}`
    )
    const currentPageData = response.data ?? []
    bookings.push(...currentPageData)

    if (currentPageData.length === 0) break
    if (
      response.meta?.total_count !== undefined &&
      response.meta.per_page !== undefined &&
      response.meta.per_page > 0 &&
      bookings.length >= response.meta.total_count
    ) {
      break
    }

    page += 1
    await sleep(PAGE_DELAY_MS)
  }

  return bookings
}

export async function fetchBooking(uplistingId: string): Promise<UplistingBooking> {
  const response = await uplistingFetch<UplistingSingleResponse<UplistingBooking>>(
    `/bookings/${uplistingId}`
  )
  return response.data
}

export async function fetchBookingsForProperty(
  uplistingPropertyId: string
): Promise<UplistingBooking[]> {
  const response = await uplistingFetch<UplistingListResponse<UplistingBooking>>(
    `/properties/${uplistingPropertyId}/bookings`
  )
  return response.data ?? []
}
