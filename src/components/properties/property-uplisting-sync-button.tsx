"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { resyncPropertyFromUplisting } from "@/app/(dashboard)/dashboard/properties/actions"
import { Button } from "@/components/ui/button"

type PropertyUplistingSyncButtonProps = {
  propertyId: string
}

export function PropertyUplistingSyncButton({ propertyId }: PropertyUplistingSyncButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onSync = () => {
    startTransition(async () => {
      try {
        const result = await resyncPropertyFromUplisting(propertyId)
        if (result.bookingWarning) {
          toast.warning(`Property updated. ${result.bookingWarning}`)
        } else {
          toast.success("Property and bookings updated from Uplisting.")
        }
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Uplisting sync failed.")
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
      disabled={isPending}
      onClick={onSync}
    >
      <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Syncing…" : "Sync from Uplisting"}
    </Button>
  )
}
