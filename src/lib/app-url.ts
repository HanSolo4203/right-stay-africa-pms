/** Base app URL for webhooks and absolute links (no trailing slash). */
export function getAppUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "")
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "")
    return `https://${host}`
  }

  return "http://localhost:3001"
}

export function isPublicAppUrlConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim())
}
