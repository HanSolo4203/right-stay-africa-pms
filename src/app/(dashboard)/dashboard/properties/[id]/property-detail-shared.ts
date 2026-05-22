import type { Prisma } from "@prisma/client"

export const validTabs = [
  "overview",
  "owner",
  "financials",
  "bookings",
  "live-bookings",
  "info-guide",
  "contract",
  "photos",
] as const

export type PropertyTab = (typeof validTabs)[number]

export function isValidPropertyTab(tab: string | undefined): tab is PropertyTab {
  if (!tab) return false
  return (validTabs as readonly string[]).includes(tab)
}

export function parseEmergencyContacts(value: Prisma.JsonValue): Array<{ name: string; phone: string }> {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const name = "name" in item && typeof item.name === "string" ? item.name : ""
    const phone = "phone" in item && typeof item.phone === "string" ? item.phone : ""
    if (!name.trim() && !phone.trim()) return []
    return [{ name, phone }]
  })
}
