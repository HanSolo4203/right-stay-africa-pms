import { prisma } from "@/lib/prisma"
import type { ParsedBookingRow } from "@/lib/csv-import/parse-bookings-csv"

export type UnmatchedUplistingProperty = {
  uplisting_id: string
  nickname: string
  row_count: number
}

/**
 * Uplisting property IDs present in parsed CSV rows that have no matching Property.uplisting_id.
 */
export async function findUnmatchedUplistingProperties(
  rows: ParsedBookingRow[]
): Promise<UnmatchedUplistingProperty[]> {
  const map = new Map<string, { nickname: string; count: number }>()

  for (const row of rows) {
    const id = row.uplisting_property_id.trim()
    if (!id) continue

    const nick = row.property_nickname.trim()
    const cur = map.get(id)
    if (cur) {
      cur.count += 1
      if (!cur.nickname && nick) cur.nickname = nick
    } else {
      map.set(id, { nickname: nick, count: 1 })
    }
  }

  const ids = [...map.keys()]
  if (ids.length === 0) return []

  const found = await prisma.property.findMany({
    where: { uplisting_id: { in: ids } },
    select: { uplisting_id: true },
  })

  const foundSet = new Set(
    found.map((p) => (p.uplisting_id ?? "").trim()).filter(Boolean)
  )

  return ids
    .filter((id) => !foundSet.has(id))
    .map((id) => {
      const entry = map.get(id)!
      return {
        uplisting_id: id,
        nickname: entry.nickname,
        row_count: entry.count,
      }
    })
}
