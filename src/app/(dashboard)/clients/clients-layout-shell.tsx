"use client"

import type { ReactNode } from "react"
import { Suspense } from "react"
import { ClientsNav } from "@/components/clients/clients-nav"

export function ClientsLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col gap-6 lg:flex-row lg:gap-8">
      <Suspense
        fallback={
          <div className="h-10 w-full shrink-0 rounded-lg border border-[var(--spike-glass-border)] lg:h-auto lg:w-52" />
        }
      >
        <ClientsNav />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
