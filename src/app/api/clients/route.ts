import { NextResponse } from "next/server"
import { z } from "zod"
import { ClientStatus } from "@prisma/client"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import { prisma } from "@/lib/prisma"

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Valid email is required."),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  propertyIds: z.array(z.string().uuid()).optional(),
})

export async function GET() {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const clients = await prisma.client.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      properties: {
        select: { id: true, name: true },
      },
      _count: { select: { properties: true } },
    },
  })

  const availableProperties = await prisma.property.findMany({
    where: { client_id: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      owner: { select: { full_name: true, email: true } },
    },
  })

  return NextResponse.json({
    availableProperties: availableProperties.map((p) => ({
      id: p.id,
      name: p.name,
      ownerName: p.owner?.full_name?.trim() || null,
      ownerEmail: p.owner?.email?.trim() || null,
    })),
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      propertyCount: c._count.properties,
      properties: c.properties,
      createdAt: c.created_at.toISOString(),
    })),
  })
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

  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    )
  }

  const propertyIds = parsed.data.propertyIds ?? []
  if (propertyIds.length > 0) {
    const taken = await prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        client_id: { not: null },
      },
      select: { id: true, name: true },
    })
    if (taken.length > 0) {
      return NextResponse.json(
        {
          error: `Properties already assigned to a client: ${taken.map((p) => p.name).join(", ")}`,
        },
        { status: 400 }
      )
    }
  }

  try {
    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          name: parsed.data.name.trim(),
          email: parsed.data.email.trim().toLowerCase(),
          status: parsed.data.status ?? ClientStatus.ACTIVE,
        },
      })
      if (propertyIds.length > 0) {
        await tx.property.updateMany({
          where: { id: { in: propertyIds }, client_id: null },
          data: { client_id: created.id },
        })
      }
      return created
    })

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        status: client.status,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create client."
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A client with this email already exists." }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
