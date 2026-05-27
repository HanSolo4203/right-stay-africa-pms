import { NextResponse } from "next/server"
import { z } from "zod"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { aggregatePortfolioPeriod } from "@/lib/clients/portfolio-period-summary-server"
import { getCompanySettingsForPdf } from "@/lib/company-settings"
import { renderCompanyPeriodStatementPdf } from "@/lib/owner-statement/render-company-period-pdf"

const bodySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

export async function POST(request: Request) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
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
    const [summary, companySettings] = await Promise.all([
      aggregatePortfolioPeriod(parsed.data.month, parsed.data.year),
      getCompanySettingsForPdf(),
    ])
    const buffer = await renderCompanyPeriodStatementPdf(summary, companySettings)
    const filename = `Right-Stay-Portfolio_${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate company statement."
    console.error("[clients/statements/company-pdf POST]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
