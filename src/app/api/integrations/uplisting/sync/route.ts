import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  fetchUplistingBookings,
  fetchUplistingProperties,
  UplistingRateLimitError,
} from "@/lib/integrations/uplisting"

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (user.user_metadata?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  try {
    const [properties, bookings] = await Promise.all([
      fetchUplistingProperties(),
      fetchUplistingBookings(),
    ])

    await prisma.$transaction([
      ...properties.map((property) =>
        prisma.uplistingPropertyCache.upsert({
          where: { uplisting_id: property.uplisting_id },
          update: {
            ...property,
            synced_at: new Date(),
            raw_payload: property.raw_payload as Prisma.InputJsonValue,
          },
          create: {
            ...property,
            raw_payload: property.raw_payload as Prisma.InputJsonValue,
          },
        })
      ),
      ...bookings.map((booking) =>
        prisma.uplistingBookingCache.upsert({
          where: { uplisting_id: booking.uplisting_id },
          update: {
            ...booking,
            synced_at: new Date(),
            raw_payload: booking.raw_payload as Prisma.InputJsonValue,
          },
          create: {
            ...booking,
            raw_payload: booking.raw_payload as Prisma.InputJsonValue,
          },
        })
      ),
    ])

    return NextResponse.json({
      success: true,
      properties_synced: properties.length,
      bookings_synced: bookings.length,
    })
  } catch (error) {
    if (error instanceof UplistingRateLimitError) {
      console.warn("[uplisting] Manual sync hit rate limit.")
      return NextResponse.json(
        {
          error: "Uplisting API rate limit reached. Please retry sync in a moment.",
        },
        { status: 429 }
      )
    }

    const message = error instanceof Error ? error.message : "Uplisting sync failed."
    console.error("[uplisting] Manual sync failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
