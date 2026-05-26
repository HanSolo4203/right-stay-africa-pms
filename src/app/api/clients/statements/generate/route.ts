import { NextResponse } from "next/server"
import { z } from "zod"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { generatePropertyStatement } from "@/lib/clients/statement-service"
import { statementAutomaticExpenseLineSchema } from "@/lib/validations/statement-expense"

const bodySchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  bookingIds: z.array(z.string().uuid()).optional(),
  statementId: z.string().uuid().optional().nullable(),
  automaticExpenseLines: z.array(statementAutomaticExpenseLineSchema).optional(),
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
    const result = await generatePropertyStatement(parsed.data)
    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.downloadName}"`,
        "X-Statement-Id": result.statementId,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate statement."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
