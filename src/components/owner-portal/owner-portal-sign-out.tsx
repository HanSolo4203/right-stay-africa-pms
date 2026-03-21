"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

export function OwnerPortalSignOut() {
  const router = useRouter()

  const onSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onSignOut}>
      <LogOut className="size-4" />
      Sign Out
    </Button>
  )
}
