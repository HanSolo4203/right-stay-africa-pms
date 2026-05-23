import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.statementExpense.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 })
  }

  await prisma.statementExpense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
