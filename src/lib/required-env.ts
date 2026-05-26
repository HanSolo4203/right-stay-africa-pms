const PUBLIC_SUPABASE_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

const SERVER_VARS = ["DATABASE_URL"] as const

function isSet(name: string): boolean {
  const value = process.env[name]?.trim()
  return Boolean(value && !value.includes("<paste"))
}

export function getMissingPublicEnvVars(): string[] {
  return PUBLIC_SUPABASE_VARS.filter((name) => !isSet(name))
}

export function getMissingServerEnvVars(): string[] {
  return SERVER_VARS.filter((name) => !isSet(name))
}

export function assertPublicEnvConfigured(): void {
  const missing = getMissingPublicEnvVars()
  if (missing.length === 0) return
  throw new Error(
    `Missing environment variables: ${missing.join(", ")}. Add them in Vercel → Project → Settings → Environment Variables (same names as in .env.local).`
  )
}

export function assertServerEnvConfigured(): void {
  const missing = getMissingServerEnvVars()
  if (missing.length === 0) return
  throw new Error(
    `Missing environment variables: ${missing.join(", ")}. Add them in Vercel → Project → Settings → Environment Variables (same names as in .env.local).`
  )
}

/** Human-readable hint when Prisma/Postgres fails at runtime. */
export function describeDatabaseError(message: string): string | null {
  const lower = message.toLowerCase()
  if (message.includes("DATABASE_URL is not set")) {
    return "DATABASE_URL is not set on the server. Copy it from .env.local into Vercel environment variables."
  }
  if (
    lower.includes("can't reach database") ||
    message.includes("P1001") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout")
  ) {
    return "Cannot reach Postgres. Resume the Supabase project if paused, and use the pooled connection string (port 6543, ?pgbouncer=true) for DATABASE_URL on Vercel."
  }
  if (
    lower.includes("does not exist") ||
    message.includes("P2021") ||
    message.includes("P2022") ||
    lower.includes("column") && lower.includes("does not exist")
  ) {
    return "Database schema is behind the app. Run: npx prisma migrate deploy (with DIRECT_URL or MIGRATE_DATABASE_URL set)."
  }
  return null
}
