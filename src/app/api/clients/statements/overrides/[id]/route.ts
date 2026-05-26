import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { serializeStatementBookingOverride } from "@/lib/clients/statement-booking-overrides"
import { rebuildPropertyStatementForPeriod } from "@/lib/clients/statement-service"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const existing = await prisma.statementBookingOverride.findUnique({
      where: { id },
      include: { property: { select: { client_id: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Override not found." }, { status: 404 })
    }

    const clientId = existing.property.client_id
    if (!clientId) {
      return NextResponse.json(
        { error: "Assign a client to this property before managing overrides." },
        { status: 400 }
      )
    }

    await prisma.statementBookingOverride.delete({ where: { id } })

    const statement = await rebuildPropertyStatementForPeriod(
      clientId,
      existing.property_id,
      existing.month,
      existing.year
    )

    const overrides = await prisma.statementBookingOverride.findMany({
      where: {
        property_id: existing.property_id,
        month: existing.month,
        year: existing.year,
      },
    })

    return NextResponse.json({
      statement,
      overrides: overrides.map(serializeStatementBookingOverride),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to remove override."
    console.error("[clients/statements/overrides DELETE]", e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
