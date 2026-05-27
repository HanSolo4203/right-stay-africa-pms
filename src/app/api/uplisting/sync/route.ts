import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"
import {
  assertPropertySyncRateLimit,
  resolveUplistingPropertyId,
} from "@/lib/uplisting/live-bookings-api"
import { syncBookingsForProperty } from "@/lib/uplisting/sync-bookings"
import { validateUplistingConfig } from "@/lib/uplisting"

async function handleSyncForProperty(propertyId: string) {
  const rateLimitMessage = await assertPropertySyncRateLimit(propertyId)
  if (rateLimitMessage) {
    return NextResponse.json({ error: rateLimitMessage }, { status: 429 })
  }

  const { uplistingId, error: resolveError } = await resolveUplistingPropertyId(propertyId)
  if (resolveError || !uplistingId) {
    return NextResponse.json({ error: resolveError ?? "Property not linked." }, { status: 400 })
  }

  try {
    const result = await syncBookingsForProperty(uplistingId)

    await prisma.property.update({
      where: { id: propertyId },
      data: { last_synced_at: new Date() },
    })

    const lastSyncedAt = new Date().toISOString()

    return NextResponse.json({
      success: result.errors.length === 0,
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      lastSyncedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uplisting sync failed."
    console.error("[uplisting] Property sync failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { configured, missingKeys } = validateUplistingConfig()
  if (!configured) {
    return NextResponse.json(
      { error: `Missing Uplisting configuration: ${missingKeys.join(", ")}` },
      { status: 500 }
    )
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim()
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId query parameter is required." }, { status: 400 })
  }

  return handleSyncForProperty(propertyId)
}

export async function POST(request: Request) {
  const { configured, missingKeys } = validateUplistingConfig()
  if (!configured) {
    return NextResponse.json(
      { error: `Missing Uplisting configuration: ${missingKeys.join(", ")}` },
      { status: 500 }
    )
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { propertyId?: string } | null
  const propertyId = body?.propertyId?.trim()
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required in request body." }, { status: 400 })
  }

  return handleSyncForProperty(propertyId)
}

