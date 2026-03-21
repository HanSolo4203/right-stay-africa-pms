import { NextResponse } from "next/server"
import { importBookingsFromCsv } from "@/lib/csv-import/import-bookings"
import { parseBookingsCsv } from "@/lib/csv-import/parse-bookings-csv"
import { findUnmatchedUplistingProperties } from "@/lib/csv-import/unmatched-properties"
import { getUser } from "@/lib/auth/get-user"

const MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPES = new Set(["text/csv", "text/plain"])

function isCsvFilename(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".csv")
}

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 })
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing file. Use form field name \"file\"." },
        { status: 400 }
      )
    }

    const filename = file.name ?? ""
    if (!isCsvFilename(filename)) {
      return NextResponse.json(
        { success: false, error: "File must have a .csv extension." },
        { status: 400 }
      )
    }

    const mime = file.type.trim().toLowerCase()
    if (mime && !ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        {
          success: false,
          error: "File must be text/csv or text/plain.",
        },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ success: false, error: "File is empty." }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "File must not be larger than 10MB." },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    if (!csvText.trim()) {
      return NextResponse.json({ success: false, error: "File is empty." }, { status: 400 })
    }

    const { rows, errors: parseErrors } = parseBookingsCsv(csvText)

    if (rows.length === 0 && parseErrors.length > 0) {
      return NextResponse.json(
        {
          success: false as const,
          error: "CSV parsing failed.",
          errors: parseErrors,
        },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid booking rows found.",
        },
        { status: 400 }
      )
    }

    const unmatched_properties = await findUnmatchedUplistingProperties(rows)

    const log = await importBookingsFromCsv(rows, user.id, filename)

    const propertySummary = log.property_summary as Record<
      string,
      { property_name: string; new: number; updated: number; skipped: number }
    >
    const logErrors = log.errors as Array<{ row: number; error: string }>

    return NextResponse.json({
      success: true,
      unmatched_properties,
      summary: {
        total_rows: log.total_rows,
        new_records: log.new_records,
        updated_records: log.updated_records,
        skipped_records: log.skipped_records,
        error_records: log.error_records,
        property_breakdown: propertySummary ?? {},
        errors: Array.isArray(logErrors) ? logErrors : [],
        import_log_id: log.id,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
