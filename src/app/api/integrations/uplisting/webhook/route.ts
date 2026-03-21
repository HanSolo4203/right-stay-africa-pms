import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  mapUplistingBooking,
  mapUplistingProperty,
  normalizeWebhookResources,
  type WebhookPayload,
} from "@/lib/integrations/uplisting"

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const resources = normalizeWebhookResources(payload as WebhookPayload)

  if (!resources.length) {
    return NextResponse.json({ success: true, processed: 0 })
  }

  try {
    let processed = 0

    for (const resource of resources) {
      if (!resource || typeof resource !== "object") continue
      const candidate = resource as {
        id?: string
        type?: string
        attributes?: Record<string, unknown>
      }

      if (!candidate.id || !candidate.type || !candidate.attributes) {
        continue
      }

      if (candidate.type === "properties") {
        const mapped = mapUplistingProperty({
          id: candidate.id,
          type: candidate.type,
          attributes: candidate.attributes,
        })

        await prisma.uplistingPropertyCache.upsert({
          where: { uplisting_id: mapped.uplisting_id },
          update: {
            ...mapped,
            synced_at: new Date(),
            raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
          },
          create: {
            ...mapped,
            raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
          },
        })
        processed += 1
        continue
      }

      if (candidate.type === "bookings") {
        const mapped = mapUplistingBooking({
          id: candidate.id,
          type: candidate.type,
          attributes: candidate.attributes,
        })

        await prisma.uplistingBookingCache.upsert({
          where: { uplisting_id: mapped.uplisting_id },
          update: {
            ...mapped,
            synced_at: new Date(),
            raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
          },
          create: {
            ...mapped,
            raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
          },
        })
        processed += 1
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process Uplisting webhook."
    console.error("[uplisting] Webhook processing failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
