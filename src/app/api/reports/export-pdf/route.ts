import { NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/auth/get-user"
import { renderFinancialReportPdf } from "@/lib/reports/render-financial-report-pdf"
import type { ReportsSummaryResponse } from "@/lib/reports/types"

const bodySchema = z.object({
  summaryData: z.custom<ReportsSummaryResponse>(),
})

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  try {
    const data = parsed.data.summaryData
    const buffer = await renderFinancialReportPdf(data)
    const safeLabel = data.period.label.replace(/[^\w-]+/g, "-")
    const filename = `rsa-report-${safeLabel}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate report PDF."
    console.error("[reports/export-pdf POST]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
