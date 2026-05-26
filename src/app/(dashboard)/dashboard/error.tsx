"use client"

import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { describeDatabaseError } from "@/lib/required-env"

const GENERIC_PRODUCTION_MESSAGE =
  "An error occurred in the Server Components render. The specific message is omitted in production builds"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard]", error)
  }, [error])

  const message = error.message ?? "Something went wrong."
  const isGenericProduction = message.includes(GENERIC_PRODUCTION_MESSAGE)
  const dbHint = useMemo(() => describeDatabaseError(message), [message])
  const isDb =
    Boolean(dbHint) ||
    message.includes("Can't reach database") ||
    message.includes("P1001") ||
    message.toLowerCase().includes("database server") ||
    message.includes("DATABASE_URL")

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Dashboard couldn&apos;t load</h2>
      {isGenericProduction ? (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Production hides the real error. On Vercel, open <strong>Deployments → your deployment →
            Runtime Logs</strong> and search for the digest below.
          </p>
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            <li>
              Copy every variable from <code className="rounded bg-white px-1 py-0.5 text-xs">.env.local</code> into
              Vercel → Settings → Environment Variables (at minimum{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">DATABASE_URL</code>,{" "}
              <code className="rounded bg-white px-1 py-0.5 text-xs">DIRECT_URL</code>).
            </li>
            <li>Redeploy after saving env vars.</li>
            <li>Resume the Supabase project if it is paused.</li>
          </ul>
        </div>
      ) : isDb ? (
        <div className="space-y-2 text-sm text-slate-700">
          <p>{dbHint ?? "The app can't reach your Postgres database (often Supabase)."}</p>
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            <li>Free projects pause after inactivity — resume the project in the Supabase dashboard.</li>
            <li>
              Use the pooled URL (port 6543, <code className="rounded bg-white px-1 py-0.5 text-xs">?pgbouncer=true</code>
              ) for <code className="rounded bg-white px-1 py-0.5 text-xs">DATABASE_URL</code> on Vercel.
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-700">{message}</p>
      )}
      {error.digest ? (
        <p className="font-mono text-xs text-slate-500">Reference: {error.digest}</p>
      ) : null}
      <Button type="button" onClick={() => reset()} variant="default" className="bg-green-700 hover:bg-green-800">
        Try again
      </Button>
    </div>
  )
}
