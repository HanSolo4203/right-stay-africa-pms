"use client"

import type { ReactNode } from "react"
import { Suspense } from "react"
import { ReportsNav } from "@/components/reports/reports-nav"

export function ReportsLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight spike-heading">Financial reports</h1>
        <p className="mt-1 text-sm spike-text-secondary">
          Right Stay Africa portfolio P&amp;L — company-wide performance
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-10 w-full shrink-0 rounded-lg border border-[var(--spike-glass-border)]" />
        }
      >
        <ReportsNav />
      </Suspense>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
