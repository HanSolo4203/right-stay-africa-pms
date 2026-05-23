import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import {
  loadManagementFeesForClient,
  updatePropertyManagementFee,
} from "@/lib/clients/management-fee-service"
import {
  listManagementFeesSchema,
  updateManagementFeeSchema,
} from "@/lib/validations/management-fee"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = listManagementFeesSchema.safeParse({
    clientId: searchParams.get("clientId"),
    month: searchParams.get("month"),
    year: searchParams.get("year"),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    )
  }

  try {
    const data = await loadManagementFeesForClient(
      parsed.data.clientId,
      parsed.data.month,
      parsed.data.year
    )
    return NextResponse.json({
      month: parsed.data.month,
      year: parsed.data.year,
      ...data,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load management fees."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(request: Request) {
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

  const parsed = updateManagementFeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const property = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { client_id: true },
  })
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  try {
    await updatePropertyManagementFee({
      propertyId: parsed.data.propertyId,
      feeType: parsed.data.feeType,
      rate: parsed.data.rate,
      welcomePackFee: parsed.data.welcomePackFee,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update fee."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
