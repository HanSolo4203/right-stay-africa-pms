import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { isUplistingWebhookAuthorized } from "@/lib/uplisting/webhook-auth"
import { processUplistingWebhookPayload } from "@/lib/uplisting/webhook-booking"

export const runtime = "nodejs"

/*
 * SETUP CHECKLIST — do this after deploying:
 *
 * 1. Add to .env.local (and Vercel environment variables):
 *    UPLISTING_API_KEY=<from Uplisting Connect > API page>
 *    UPLISTING_WEBHOOK_SECRET=<from Uplisting Connect > Webhook page>
 *    NEXT_PUBLIC_APP_URL=https://right-stay-africa-pms.vercel.app
 *
 * 2. For each property, add its Uplisting Property ID in property settings
 *    (find it in Uplisting under the listing URL)
 *
 * 3. In Uplisting (Connect > Webhook), register:
 *    Endpoint: https://right-stay-africa-pms.vercel.app/api/webhooks/uplisting
 *    Events: booking.created, booking.modified, booking.cancelled
 *
 * 4. Run initial sync for each property via the "Sync now" button
 *    in the Live Bookings tab
 *
 * 5. IMPORTANT: Monitor the first 10 webhook events in Vercel logs
 *    to confirm field names are mapping correctly. The rawPayload
 *    column stores the full payload for debugging.
 *
 * 6. After confirming field names are correct, remove any temporary raw
 *    payload logging from the webhook handler.
 */

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
