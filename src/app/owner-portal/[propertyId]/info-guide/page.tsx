import type { Prisma } from "@prisma/client"
import { OwnerInfoGuideReadonly } from "@/components/owner-portal/owner-info-guide-readonly"
import { prisma } from "@/lib/prisma"

type OwnerInfoGuidePageProps = {
  params: Promise<{ propertyId: string }>
}

function parseEmergencyContacts(value: Prisma.JsonValue): Array<{ name: string; phone: string }> {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const name = "name" in item && typeof item.name === "string" ? item.name : ""
    const phone = "phone" in item && typeof item.phone === "string" ? item.phone : ""
    if (!name.trim() && !phone.trim()) return []
    return [{ name, phone }]
  })
}

export default async function OwnerInfoGuidePage({ params }: OwnerInfoGuidePageProps) {
  const { propertyId } = await params
  const row = await prisma.infoGuide.findUnique({
    where: { property_id: propertyId },
    select: {
      wifi_name: true,
      wifi_password: true,
      parking_instructions: true,
      access_code: true,
      lockbox_code: true,
      electricity_notes: true,
      emergency_contacts: true,
      notes: true,
    },
  })

  return (
    <OwnerInfoGuideReadonly
      infoGuide={
        row
          ? {
              wifi_name: row.wifi_name,
              wifi_password: row.wifi_password,
              parking_instructions: row.parking_instructions,
              access_code: row.access_code,
              lockbox_code: row.lockbox_code,
              electricity_notes: row.electricity_notes,
              emergency_contacts: parseEmergencyContacts(row.emergency_contacts),
              notes: row.notes,
            }
          : null
      }
    />
  )
}
