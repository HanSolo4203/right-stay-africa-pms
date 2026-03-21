import { Prisma, PropertyStatus, PropertyType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  fetchAllProperties,
  fetchPropertyPayload,
  toUplistingProperty,
  type UplistingProperty,
} from "./client"
import {
  buildUplistingInfoGuideNotes,
  extractLocationFromUplistingAttributes,
  extractUplistingPhotoUrls,
  extractUnitAndBuilding,
} from "./extract-uplisting-media"

const UPLISTING_TYPE_TO_PROPERTY_TYPE: Record<string, PropertyType> = {
  Apartment: PropertyType.APARTMENT,
  House: PropertyType.HOUSE,
  Studio: PropertyType.STUDIO,
  Townhouse: PropertyType.TOWNHOUSE,
}

function mapUplistingTypeToPropertyType(uplistingType: string): PropertyType {
  return UPLISTING_TYPE_TO_PROPERTY_TYPE[uplistingType] ?? PropertyType.OTHER
}

function attrRecord(property: UplistingProperty): Record<string, unknown> {
  return property.attributes as unknown as Record<string, unknown>
}

/**
 * Maps Uplisting API property payload to fields we persist from Uplisting (plus create defaults).
 * Full API document JSON is stored separately via `rawPayload` in the upsert.
 */
export function mapUplistingProperty(uplistingProperty: UplistingProperty) {
  const attrs = uplistingProperty.attributes
  const record = attrRecord(uplistingProperty)
  const name =
    (typeof attrs.name === "string" && attrs.name.trim()) ||
    (typeof attrs.nickname === "string" && attrs.nickname.trim()) ||
    "Untitled property"

  const { unit_number, building_name } = extractUnitAndBuilding(record)
  const description =
    typeof attrs.description === "string" && attrs.description.trim()
      ? attrs.description.trim()
      : null

  return {
    name,
    description,
    type: mapUplistingTypeToPropertyType(attrs.type),
    bedrooms: attrs.bedrooms_count,
    bathrooms: attrs.bathrooms_count,
    uplisting_id: uplistingProperty.id,
    uplisting_slug: attrs.property_slug,
    last_synced_at: new Date(),
    address: "" as const,
    city: "" as const,
    status: PropertyStatus.ONBOARDING,
    unit_number: unit_number ?? null,
    building_name: building_name ?? null,
  }
}

export type SyncPropertiesResult = {
  synced: number
  created: number
  updated: number
  skipped?: number
  errors: string[]
}

type UpsertMode = "minimal" | "full"

function isBlank(value: string | null | undefined): boolean {
  return value == null || String(value).trim() === ""
}

type ExistingForPreserve = {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  suburb: string | null
  unit_number: string | null
  building_name: string | null
  cover_photo_url: string | null
  sync_enabled: boolean
  _count: { photos: number }
}

async function upsertOneProperty(
  uplistingProperty: UplistingProperty,
  options: {
    mode: UpsertMode
    rawPayload: Prisma.InputJsonValue
    photoUrls?: string[]
    /** When true, existing rows: do not overwrite filled text/location/cover; never replace photo gallery if any photos exist; respect sync_enabled. */
    preserveManualOnUpdate?: boolean
    /** Replace `Photo` rows from Uplisting whenever URLs exist (explicit single-property sync). */
    alwaysSyncPhotos?: boolean
  }
): Promise<"created" | "updated" | "skipped"> {
  const uplistingId = uplistingProperty.id
  const mapped = mapUplistingProperty(uplistingProperty)
  const attrs = attrRecord(uplistingProperty)
  const preserve = Boolean(options.preserveManualOnUpdate)

  const existing = await prisma.property.findUnique({
    where: { uplisting_id: uplistingId },
    select: preserve
      ? {
          id: true,
          name: true,
          description: true,
          address: true,
          city: true,
          suburb: true,
          unit_number: true,
          building_name: true,
          cover_photo_url: true,
          sync_enabled: true,
          _count: { select: { photos: true } },
        }
      : { id: true },
  })

  if (preserve && existing && "sync_enabled" in existing && !existing.sync_enabled) {
    return "skipped"
  }

  const baseUpdate: Prisma.PropertyUpdateInput = {
    name: mapped.name,
    type: mapped.type,
    bedrooms: mapped.bedrooms,
    bathrooms: mapped.bathrooms,
    uplisting_slug: mapped.uplisting_slug,
    uplisting_raw: options.rawPayload,
    last_synced_at: mapped.last_synced_at,
    description: mapped.description,
  }

  if (options.mode === "full") {
    const loc = extractLocationFromUplistingAttributes(attrs)
    if (loc.address) baseUpdate.address = loc.address
    if (loc.city) baseUpdate.city = loc.city
    if (loc.suburb !== undefined) baseUpdate.suburb = loc.suburb

    if (mapped.unit_number) baseUpdate.unit_number = mapped.unit_number
    if (mapped.building_name) baseUpdate.building_name = mapped.building_name

    const urls = options.photoUrls ?? []
    if (urls.length > 0) {
      baseUpdate.cover_photo_url = urls[0]
    }
  }

  let updatePayload: Prisma.PropertyUpdateInput = baseUpdate

  if (preserve && existing && "sync_enabled" in existing) {
    const row = existing as ExistingForPreserve
    const always: Prisma.PropertyUpdateInput = {
      uplisting_raw: options.rawPayload,
      last_synced_at: mapped.last_synced_at,
      uplisting_slug: mapped.uplisting_slug,
      type: mapped.type,
      bedrooms: mapped.bedrooms,
      bathrooms: mapped.bathrooms,
    }
    if (options.mode === "full") {
      if (isBlank(row.name)) always.name = mapped.name
      if (isBlank(row.description)) always.description = mapped.description
      const loc = extractLocationFromUplistingAttributes(attrs)
      if (isBlank(row.address) && loc.address) always.address = loc.address
      if (isBlank(row.city) && loc.city) always.city = loc.city
      if (isBlank(row.suburb) && loc.suburb !== undefined) always.suburb = loc.suburb
      if (isBlank(row.unit_number) && mapped.unit_number) always.unit_number = mapped.unit_number
      if (isBlank(row.building_name) && mapped.building_name) always.building_name = mapped.building_name
      const urls = options.photoUrls ?? []
      if (isBlank(row.cover_photo_url) && urls.length > 0) {
        always.cover_photo_url = urls[0]
      }
    }
    updatePayload = always
  }

  const locForCreate = extractLocationFromUplistingAttributes(attrs)

  const property = await prisma.property.upsert({
    where: { uplisting_id: uplistingId },
    update: updatePayload,
    create: {
      name: mapped.name,
      description: mapped.description,
      type: mapped.type,
      bedrooms: mapped.bedrooms,
      bathrooms: mapped.bathrooms,
      uplisting_id: mapped.uplisting_id,
      uplisting_slug: mapped.uplisting_slug,
      uplisting_raw: options.rawPayload,
      last_synced_at: mapped.last_synced_at,
      address: locForCreate.address ?? mapped.address,
      city: locForCreate.city ?? mapped.city,
      suburb: locForCreate.suburb ?? null,
      status: mapped.status,
      parking_bays: [],
      unit_number: mapped.unit_number,
      building_name: mapped.building_name,
      cover_photo_url:
        options.mode === "full" && options.photoUrls && options.photoUrls.length > 0
          ? options.photoUrls[0]
          : null,
    },
    select: { id: true },
  })

  const existingPhotoCount =
    preserve && existing && "_count" in existing
      ? Number((existing as { _count: { photos: number } })._count.photos)
      : -1

  const shouldImportPhotos =
    options.mode === "full" &&
    (options.photoUrls?.length ?? 0) > 0 &&
    (Boolean(options.alwaysSyncPhotos) || existingPhotoCount < 0 || existingPhotoCount === 0)

  if (shouldImportPhotos && options.photoUrls) {
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { property_id: property.id } }),
      prisma.photo.createMany({
        data: options.photoUrls.map((url, index) => ({
          property_id: property.id,
          url,
          is_cover: index === 0,
          caption: index === 0 ? "Cover (Uplisting)" : null,
        })),
      }),
    ])
  }

  if (options.mode === "full") {
    const guideNotes = buildUplistingInfoGuideNotes(attrs)
    if (guideNotes) {
      const existingGuide = await prisma.infoGuide.findUnique({
        where: { property_id: property.id },
        select: { id: true },
      })
      if (!existingGuide) {
        await prisma.infoGuide.create({
          data: {
            property_id: property.id,
            notes: guideNotes,
          },
        })
      }
    }
  }

  return existing ? "updated" : "created"
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function finalizeSyncLog(
  logId: string,
  payload: {
    status: "success" | "error"
    records_synced: number
    error_message?: string | null
  }
) {
  await prisma.uplistingSyncLog.update({
    where: { id: logId },
    data: {
      status: payload.status,
      records_synced: payload.records_synced,
      error_message: payload.error_message ?? null,
      completed_at: new Date(),
    },
  })
}

export async function syncProperties(): Promise<SyncPropertiesResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "properties",
      status: "running",
    },
  })

  try {
    const properties = await fetchAllProperties()

    for (const uplistingProperty of properties) {
      try {
        const rawPayload = uplistingProperty.attributes as unknown as Prisma.InputJsonValue
        const outcome = await upsertOneProperty(uplistingProperty, {
          mode: "minimal",
          rawPayload,
        })
        if (outcome === "created") created += 1
        else if (outcome === "updated") updated += 1
      } catch (error) {
        errors.push(
          `[${uplistingProperty.id}] ${errorMessage(error, "Sync failed for property.")}`
        )
      }
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors.join("; ") : null,
    })

    return { synced, created, updated, errors }
  } catch (error) {
    const message = errorMessage(error, "Property sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, errors: [message] }
  }
}

export async function syncSingleProperty(
  uplistingId: string
): Promise<SyncPropertiesResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "property",
      status: "running",
    },
  })

  try {
    const doc = await fetchPropertyPayload(uplistingId)
    const uplistingProperty = toUplistingProperty(doc.data)
    const photoUrls = extractUplistingPhotoUrls(
      doc.data.attributes,
      doc.included,
      doc.data.relationships
    )
    const rawPayload = doc as unknown as Prisma.InputJsonValue

    try {
      const outcome = await upsertOneProperty(uplistingProperty, {
        mode: "full",
        rawPayload,
        photoUrls,
        alwaysSyncPhotos: true,
      })
      if (outcome === "created") created = 1
      else if (outcome === "updated") updated = 1
    } catch (error) {
      errors.push(errorMessage(error, "Sync failed for property."))
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors[0] ?? null : null,
    })

    return { synced, created, updated, errors }
  } catch (error) {
    const message = errorMessage(error, "Property sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, errors: [message] }
  }
}

const BULK_FULL_SYNC_DELAY_MS = 400

/**
 * Fetches every property from Uplisting (full document + photos) and upserts into Postgres.
 * Existing rows: keeps status, parking_bays, sync_enabled; only fills empty name/address/description/etc.;
 * does not replace the photo gallery if the property already has any photos; skips rows with sync_enabled false.
 */
export async function syncAllPropertiesFullPreserveManual(): Promise<SyncPropertiesResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "properties_full_preserve",
      status: "running",
    },
  })

  try {
    const list = await fetchAllProperties()

    for (let i = 0; i < list.length; i++) {
      const uplistingProperty = list[i]
      try {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, BULK_FULL_SYNC_DELAY_MS))
        }

        const doc = await fetchPropertyPayload(uplistingProperty.id)
        const fullProp = toUplistingProperty(doc.data)
        const photoUrls = extractUplistingPhotoUrls(
          doc.data.attributes,
          doc.included,
          doc.data.relationships
        )
        const rawPayload = doc as unknown as Prisma.InputJsonValue

        const outcome = await upsertOneProperty(fullProp, {
          mode: "full",
          rawPayload,
          photoUrls,
          preserveManualOnUpdate: true,
        })

        if (outcome === "created") created += 1
        else if (outcome === "updated") updated += 1
        else if (outcome === "skipped") skipped += 1
      } catch (error) {
        errors.push(`[${uplistingProperty.id}] ${errorMessage(error, "Sync failed for property.")}`)
      }
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors.join("; ") : null,
    })

    return { synced, created, updated, skipped, errors }
  } catch (error) {
    const message = errorMessage(error, "Property sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, skipped: 0, errors: [message] }
  }
}
