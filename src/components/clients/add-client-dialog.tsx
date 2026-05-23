"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Valid email is required."),
})

type FormValues = z.infer<typeof schema>

type AvailableProperty = { id: string; name: string }

type AddClientDialogProps = {
  availableProperties: AvailableProperty[]
}

export function AddClientDialog({ availableProperties }: AddClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  })

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          status: "ACTIVE",
          propertyIds: [...selectedPropertyIds],
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create client.")
        return
      }
      toast.success("Client created.")
      setOpen(false)
      form.reset()
      setSelectedPropertyIds(new Set())
      router.refresh()
    } catch {
      toast.error("Failed to create client.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-700 hover:bg-emerald-800">Add new client</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>Create a client and optionally assign unassigned properties.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Full name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="owner@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {availableProperties.length > 0 ? (
              <div className="space-y-2">
                <Label>Properties (unassigned only)</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
                  {availableProperties.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPropertyIds.has(p.id)}
                        onChange={() => toggleProperty(p.id)}
                        className="size-4 rounded border-slate-300"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No unassigned properties available.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
                {saving ? "Saving…" : "Create client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
