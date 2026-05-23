import { NextResponse } from "next/server"
import { z } from "zod"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { generateAllStatements } from "@/lib/clients/statement-service"

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
    const summary = await generateAllStatements(parsed.data.month, parsed.data.year)
    return NextResponse.json(summary)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate statements."
    console.error("[generate-all]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
