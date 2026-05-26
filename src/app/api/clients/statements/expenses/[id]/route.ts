import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { lineCharge } from "@/lib/owner-statement/compute"
import { updateStatementExpenseSchema } from "@/lib/validations/statement-expense"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

function expenseToJson(row: {
  id: string
  client_id: string
  property_id: string
  month: number
  year: number
  description: string
  qty: number
  unit_price: { toString: () => string }
  total: { toString: () => string }
  add_ten_percent: boolean
  expense_category: string | null
  created_at: Date
}) {
  return {
    id: row.id,
    clientId: row.client_id,
    propertyId: row.property_id,
    month: row.month,
    year: row.year,
    description: row.description,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    addTenPercent: row.add_ten_percent,
    expenseCategory: row.expense_category,
    createdAt: row.created_at.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.statementExpense.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = updateStatementExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const qty = parsed.data.qty ?? existing.qty
  const unitPrice =
    parsed.data.unitPrice != null ? parsed.data.unitPrice : Number(existing.unit_price)
  const addTenPercent = parsed.data.addTenPercent ?? existing.add_ten_percent
  const base = Math.round(qty * unitPrice * 100) / 100
  const total = lineCharge(base, addTenPercent)

  const updated = await prisma.statementExpense.update({
    where: { id },
    data: {
      ...(parsed.data.description != null ? { description: parsed.data.description.trim() } : {}),
      ...(parsed.data.qty != null ? { qty: parsed.data.qty } : {}),
      ...(parsed.data.unitPrice != null ? { unit_price: parsed.data.unitPrice } : {}),
      ...(parsed.data.addTenPercent != null ? { add_ten_percent: parsed.data.addTenPercent } : {}),
      ...(parsed.data.expenseCategory !== undefined
        ? { expense_category: parsed.data.expenseCategory }
        : {}),
      total,
    },
  })

  return NextResponse.json({ expense: expenseToJson(updated) })
}

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
