/**
 * Validates incoming Uplisting webhook requests against UPLISTING_WEBHOOK_SECRET.
 * Supports common header patterns; Uplisting may send the webhook key as Bearer or Basic auth.
 */
export function isUplistingWebhookAuthorized(request: Request): boolean {
  const secret = process.env.UPLISTING_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.warn("[uplisting] UPLISTING_WEBHOOK_SECRET is not set; rejecting webhook.")
    return false
  }

  const bearer = request.headers.get("authorization")
  if (bearer === `Bearer ${secret}`) return true

  if (bearer?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(bearer.slice(6), "base64").toString("utf8")
      if (decoded === secret || decoded === `:${secret}`) return true
      const [, password] = decoded.split(":")
      if (password === secret) return true
    } catch {
      /* ignore */
    }
  }

  const headerSecret =
    request.headers.get("x-uplisting-webhook-secret") ??
    request.headers.get("x-webhook-secret") ??
    request.headers.get("uplisting-webhook-secret")

  return headerSecret === secret
}
