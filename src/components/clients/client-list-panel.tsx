"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export type ClientListEntry = {
  id: string
  name: string
  email: string
  status: "ACTIVE" | "ARCHIVED"
  isUnassignedProperty?: boolean
  propertyName?: string
}

type ClientsApiResponse = {
  clients: Array<{
    id: string
    name: string
    email: string
    status: "ACTIVE" | "ARCHIVED"
    properties: Array<{ id: string; name: string }>
  }>
  availableProperties: Array<{
    id: string
    name: string
    ownerName: string | null
    ownerEmail: string | null
  }>
}

export interface ClientListPanelProps {
  selectedClientId: string | null
  onSelect: (clientId: string) => void
  /** When set (e.g. statements page), use this list instead of /api/clients so IDs match loaded data. */
  entries?: ClientListEntry[]
}

export function ClientListPanel({ selectedClientId, onSelect, entries: entriesOverride }: ClientListPanelProps) {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [entries, setEntries] = useState<ClientListEntry[]>([])

  const load = useCallback(async () => {
    if (entriesOverride != null) {
      setEntries(entriesOverride)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/clients")
      const json = (await res.json()) as ClientsApiResponse & { error?: string }
      if (!res.ok) return
      const list: ClientListEntry[] = [
        ...json.clients.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
        })),
        ...json.availableProperties.map((p) => {
          const ownerLabel = p.ownerName?.trim()
          return {
            id: `property:${p.id}`,
            name: ownerLabel ? `${ownerLabel} — ${p.name}` : `No owner — ${p.name}`,
            email: p.ownerEmail ?? "",
            status: "ACTIVE" as const,
            isUnassignedProperty: true,
            propertyName: p.name,
          }
        }),
      ]
      setEntries(list)
    } finally {
      setLoading(false)
    }
  }, [entriesOverride])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.propertyName?.toLowerCase().includes(q) ?? false)
    )
  }, [entries, query])

  const active = filtered.filter((e) => e.status === "ACTIVE")
  const archived = filtered.filter((e) => e.status === "ARCHIVED")

  const renderRow = (entry: ClientListEntry) => {
    const selected = selectedClientId === entry.id
    return (
      <button
        key={entry.id}
        type="button"
        onClick={() => onSelect(entry.id)}
        className={`w-full rounded-lg border-l-4 px-3 py-2 text-left text-sm transition-colors ${
          selected
            ? "border-l-emerald-600 bg-emerald-50/90 font-medium text-emerald-900"
            : "border-l-transparent text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span className="block max-w-full truncate">{entry.name}</span>
        {entry.email ? (
          <span className="block max-w-full truncate text-xs text-slate-500">{entry.email}</span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="flex w-full max-w-xs min-w-[220px] flex-col gap-3">
      <Input
        placeholder="Search clients…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-white"
      />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm">
          {active.map(renderRow)}
          {archived.length > 0 ? (
            <>
              <Separator className="my-2" />
              <p className="px-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Archived
              </p>
              {archived.map(renderRow)}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
