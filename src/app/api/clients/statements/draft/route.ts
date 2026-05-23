import { NextResponse } from "next/server"
import { z } from "zod"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { savePropertyStatementDraft } from "@/lib/clients/statement-service"

const bodySchema = z.object({
  clientId: z.string().min(1),
  propertyId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  bookingIds: z.array(z.string().uuid()).min(1),
  statementId: z.string().uuid().optional().nullable(),
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
    const result = await savePropertyStatementDraft(parsed.data)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save draft."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
