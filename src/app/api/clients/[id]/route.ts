import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { parseManagementFeeType } from "@/lib/clients/management-fee-calculator"
import { updateClientSchema } from "@/lib/validations/client-profile"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  if (id.startsWith("property:")) {
    return NextResponse.json({ error: "Not a client record." }, { status: 400 })
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      properties: {
        select: {
          id: true,
          name: true,
          right_stay_commission_percent: true,
          management_fee_type: true,
        },
        orderBy: { name: "asc" },
      },
    },
  })
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 })
  }

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      bankName: client.bank_name,
      accountHolder: client.account_holder,
      accountNumber: client.account_number,
      branchCode: client.branch_code,
      accountType: client.account_type,
      properties: client.properties.map((p) => ({
        id: p.id,
        name: p.name,
        managementFeeRate:
          p.right_stay_commission_percent != null
            ? Number(p.right_stay_commission_percent)
            : null,
        managementFeeType: parseManagementFeeType(p.management_fee_type),
      })),
    },
  })
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  if (id.startsWith("property:")) {
    return NextResponse.json({ error: "Not a client record." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = updateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  if (email !== existing.email) {
    const duplicate = await prisma.client.findUnique({ where: { email } })
    if (duplicate) {
      return NextResponse.json({ error: "A client with this email already exists." }, { status: 400 })
    }
  }

  try {
    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        email,
        phone: parsed.data.phone?.trim() || null,
        status: parsed.data.status,
        bank_name: parsed.data.bankName?.trim() || null,
        account_holder: parsed.data.accountHolder?.trim() || null,
        account_number: parsed.data.accountNumber?.trim() || null,
        branch_code: parsed.data.branchCode?.trim() || null,
        account_type: parsed.data.accountType ?? null,
      },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            right_stay_commission_percent: true,
            management_fee_type: true,
          },
          orderBy: { name: "asc" },
        },
      },
    })

    return NextResponse.json({
      client: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        bankName: updated.bank_name,
        accountHolder: updated.account_holder,
        accountNumber: updated.account_number,
        branchCode: updated.branch_code,
        accountType: updated.account_type,
        properties: updated.properties.map((p) => ({
          id: p.id,
          name: p.name,
          managementFeeRate:
            p.right_stay_commission_percent != null
              ? Number(p.right_stay_commission_percent)
              : null,
          managementFeeType: parseManagementFeeType(p.management_fee_type),
        })),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update client."
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A client with this email already exists." }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.property.updateMany({
      where: { client_id: id },
      data: { client_id: null },
    }),
    prisma.client.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
