"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

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
  const isDb =
    message.includes("Can't reach database") ||
    message.includes("P1001") ||
    message.toLowerCase().includes("database server")

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Dashboard couldn&apos;t load</h2>
      {isDb ? (
        <div className="space-y-2 text-sm text-slate-700">
          <p>The app can&apos;t reach your Postgres database (often Supabase).</p>
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            <li>Free projects pause after inactivity — resume the project in the Supabase dashboard.</li>
            <li>Confirm <code className="rounded bg-white px-1 py-0.5 text-xs">DATABASE_URL</code> in{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">.env.local</code> matches the pooler URL Supabase shows.</li>
            <li>Check VPN, firewall, and that you&apos;re online.</li>
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
