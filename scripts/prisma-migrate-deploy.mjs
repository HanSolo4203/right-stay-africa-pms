#!/usr/bin/env node
/**
 * Runs `prisma migrate deploy` when a migrate URL is configured.
 *
 * Skipped on Vercel by default — build uses DIRECT_URL/MIGRATE_DATABASE_URL and fails
 * with P1000 if those differ from local or the DB password was rotated. Apply migrations
 * locally (`npm run db:migrate`) against the same Supabase project instead.
 *
 * Set RUN_PRISMA_MIGRATE_ON_BUILD=1 on Vercel only after DATABASE_URL, DIRECT_URL, and
 * MIGRATE_DATABASE_URL all use the current Supabase database password.
 */
import { spawnSync } from "node:child_process"

const onVercel = process.env.VERCEL === "1"
const force = ["1", "true", "yes"].includes(
  (process.env.RUN_PRISMA_MIGRATE_ON_BUILD ?? "").trim().toLowerCase()
)

if (onVercel && !force) {
  console.log(
    "[build] Skipping prisma migrate deploy on Vercel (set RUN_PRISMA_MIGRATE_ON_BUILD=1 to enable)."
  )
  console.log("[build] Apply migrations locally: npm run db:migrate")
  process.exit(0)
}

const url =
  process.env.MIGRATE_DATABASE_URL?.trim() ||
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim()

if (!url || url.includes("<paste")) {
  console.log("[build] No migrate database URL configured; skipping prisma migrate deploy.")
  process.exit(0)
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
