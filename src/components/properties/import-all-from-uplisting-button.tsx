"use client"

import { useTransition } from "react"
import { Download } from "lucide-react"
import { importAllPropertiesFromUplisting } from "@/app/(dashboard)/dashboard/properties/actions"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

export function ImportAllFromUplistingButton() {
  const [pending, startTransition] = useTransition()

  const onClick = () => {
    startTransition(async () => {
      try {
        const r = await importAllPropertiesFromUplisting()
        const parts = [
          `${r.created} new`,
          `${r.updated} updated`,
          ...(typeof r.skipped === "number" && r.skipped > 0 ? [`${r.skipped} skipped (sync off)`] : []),
        ]
        const summary = parts.join(", ")
        if (r.errors.length > 0) {
          toast.error(`Import finished with errors. ${summary}. First error: ${r.errors[0]}`)
        } else {
          toast.success(`Uplisting import complete: ${summary}.`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import failed.")
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={onClick}
      className="gap-2 border-slate-300 bg-white"
    >
      <Download className="size-4" />
      {pending ? "Importing…" : "Import all from Uplisting"}
    </Button>
  )
}
