import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { isUplistingWebhookAuthorized } from "@/lib/uplisting/webhook-auth"
import { processUplistingWebhookPayload } from "@/lib/uplisting/webhook-booking"

export const runtime = "nodejs"

/**
 * Uplisting webhook receiver. Always returns 200 on valid auth so Uplisting does not
 * disable the endpoint after consecutive failures.
 */
export async function POST(request: Request) {
  if (!isUplistingWebhookAuthorized(request)) {
    console.warn("[uplisting] Webhook rejected: invalid or missing secret.")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    console.error("[uplisting] Webhook: invalid JSON body.")
    return NextResponse.json({ success: true, processed: 0 })
  }

  try {
    const processed = await processUplistingWebhookPayload(
      payload,
      payload as Prisma.InputJsonValue
    )
    return NextResponse.json({ success: true, processed })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed."
    console.error("[uplisting] Webhook error (returning 200):", message)
    return NextResponse.json({ success: true, processed: 0, error: message })
  }
}
