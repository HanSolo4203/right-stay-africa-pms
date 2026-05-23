"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { AddClientDialog } from "@/components/clients/add-client-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"

export type ClientListItem = {
  id: string
  name: string
  email: string
  status: "ACTIVE" | "ARCHIVED"
  propertyCount: number
}

type ClientsListProps = {
  clients: ClientListItem[]
  availableProperties: Array<{ id: string; name: string }>
  ownerCount: number
}

function statusBadge(status: ClientListItem["status"]) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-teal-100 font-normal text-teal-800 hover:bg-teal-100">Active</Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 font-normal text-slate-600">
      Archived
    </Badge>
  )
}

export function ClientsList({ clients, availableProperties, ownerCount }: ClientsListProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isDeleting, startDelete] = useTransition()
  const [isImporting, startImport] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [clients, query])

  const importFromOwners = () => {
    startImport(async () => {
      const res = await fetch("/api/clients/sync-from-owners", { method: "POST" })
      const data = (await res.json()) as {
        imported?: number
        totalOwners?: number
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Import failed.")
        return
      }
      toast.success(
        `Imported ${data.imported ?? 0} owner(s) from ${data.totalOwners ?? 0} propert${(data.totalOwners ?? 0) === 1 ? "y" : "ies"}.`
      )
      router.refresh()
    })
  }

  const deleteClient = (id: string) => {
    startDelete(async () => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete client.")
        return
      }
      toast.success("Client deleted.")
      router.refresh()
    })
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Clients</h2>
          <p className="mt-1 text-sm text-slate-600">Manage property owners and portfolio clients.</p>
        </div>
        <AddClientDialog availableProperties={availableProperties} />
      </div>

      <Input
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client name</TableHead>
            <TableHead>Email address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center">
                {clients.length === 0 ? (
                  <div className="mx-auto max-w-md space-y-3 text-slate-600">
                    <p>No clients in the Clients hub yet.</p>
                    {ownerCount > 0 ? (
                      <>
                        <p className="text-sm">
                          {ownerCount} propert{ownerCount === 1 ? "y has" : "ies have"} an owner on the
                          Property → Owner tab. Import them to appear here and on Statements.
                        </p>
                        <Button
                          type="button"
                          className="bg-emerald-700 hover:bg-emerald-800"
                          disabled={isImporting}
                          onClick={importFromOwners}
                        >
                          {isImporting ? "Importing…" : "Import owners as clients"}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Add a client below, or set an owner on a property first.
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500">No clients match your search.</span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    href={`/clients/statements?client=${encodeURIComponent(client.id)}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-600">{client.email}</TableCell>
                <TableCell>{statusBadge(client.status)}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-rose-600"
                        disabled={isDeleting}
                        aria-label={`Delete ${client.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete client?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes {client.name} and unassigns their properties. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-rose-600 hover:bg-rose-700"
                          onClick={() => deleteClient(client.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  )
}
