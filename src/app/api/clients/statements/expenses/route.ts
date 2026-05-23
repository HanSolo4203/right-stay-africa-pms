import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { resolveClientPropertyIds } from "@/lib/clients/statement-service"
import {
  createStatementExpenseSchema,
  listStatementExpensesSchema,
} from "@/lib/validations/statement-expense"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = listStatementExpensesSchema.safeParse({
    clientId: searchParams.get("clientId"),
    propertyId: searchParams.get("propertyId"),
    month: searchParams.get("month"),
    year: searchParams.get("year"),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    )
  }

  if (parsed.data.clientId.startsWith("property:")) {
    return NextResponse.json({ expenses: [] })
  }

  try {
    const { propertyIds } = await resolveClientPropertyIds(parsed.data.clientId)
    if (!propertyIds.includes(parsed.data.propertyId)) {
      return NextResponse.json({ error: "Property does not belong to this client." }, { status: 400 })
    }

    const rows = await prisma.statementExpense.findMany({
      where: {
        client_id: parsed.data.clientId,
        property_id: parsed.data.propertyId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
      orderBy: { created_at: "asc" },
    })

    return NextResponse.json({
      expenses: rows.map((r) => ({
        id: r.id,
        clientId: r.client_id,
        propertyId: r.property_id,
        month: r.month,
        year: r.year,
        description: r.description,
        qty: r.qty,
        unitPrice: Number(r.unit_price),
        total: Number(r.total),
        createdAt: r.created_at.toISOString(),
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load expenses."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

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

  const parsed = createStatementExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  if (parsed.data.clientId.startsWith("property:")) {
    return NextResponse.json(
      { error: "Assign a client to this property before adding expenses." },
      { status: 400 }
    )
  }

  try {
    const { propertyIds } = await resolveClientPropertyIds(parsed.data.clientId)
    if (!propertyIds.includes(parsed.data.propertyId)) {
      return NextResponse.json({ error: "Property does not belong to this client." }, { status: 400 })
    }

    const total = Math.round(parsed.data.qty * parsed.data.unitPrice * 100) / 100
    const created = await prisma.statementExpense.create({
      data: {
        client_id: parsed.data.clientId,
        property_id: parsed.data.propertyId,
        month: parsed.data.month,
        year: parsed.data.year,
        description: parsed.data.description.trim(),
        qty: parsed.data.qty,
        unit_price: parsed.data.unitPrice,
        total,
      },
    })

    return NextResponse.json({
      expense: {
        id: created.id,
        clientId: created.client_id,
        propertyId: created.property_id,
        month: created.month,
        year: created.year,
        description: created.description,
        qty: created.qty,
        unitPrice: Number(created.unit_price),
        total: Number(created.total),
        createdAt: created.created_at.toISOString(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create expense."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
