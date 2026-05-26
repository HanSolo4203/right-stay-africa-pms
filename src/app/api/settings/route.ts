import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import {
  COMPANY_SETTINGS_SINGLETON_ID,
  DEFAULT_COMPANY_SETTINGS,
  emptyStringToNull,
  toCompanySettingsResponse,
} from "@/lib/company-settings"
import { prisma } from "@/lib/prisma"
import { updateCompanySettingsSchema } from "@/lib/validations/company-settings"

export async function GET() {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const row = await prisma.companySettings.findFirst()
  if (!row) {
    return NextResponse.json({
      id: null,
      ...DEFAULT_COMPANY_SETTINGS,
      tagline: null,
      registrationNumber: null,
      vatNumber: null,
      whatsapp: null,
      address: null,
      createdAt: null,
      updatedAt: null,
    })
  }

  return NextResponse.json(toCompanySettingsResponse(row))
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

  const parsed = updateCompanySettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const update = {
    ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
    ...(data.tagline !== undefined ? { tagline: emptyStringToNull(data.tagline ?? undefined) } : {}),
    ...(data.registrationNumber !== undefined
      ? { registrationNumber: emptyStringToNull(data.registrationNumber ?? undefined) }
      : {}),
    ...(data.vatNumber !== undefined
      ? { vatNumber: emptyStringToNull(data.vatNumber ?? undefined) }
      : {}),
    ...(data.email !== undefined ? { email: emptyStringToNull(data.email ?? undefined) } : {}),
    ...(data.phone !== undefined ? { phone: emptyStringToNull(data.phone ?? undefined) } : {}),
    ...(data.whatsapp !== undefined ? { whatsapp: emptyStringToNull(data.whatsapp ?? undefined) } : {}),
    ...(data.address !== undefined ? { address: emptyStringToNull(data.address ?? undefined) } : {}),
    ...(data.website !== undefined ? { website: emptyStringToNull(data.website ?? undefined) } : {}),
    ...(data.instagramUrl !== undefined
      ? { instagramUrl: emptyStringToNull(data.instagramUrl ?? undefined) }
      : {}),
    ...(data.facebookUrl !== undefined
      ? { facebookUrl: emptyStringToNull(data.facebookUrl ?? undefined) }
      : {}),
    ...(data.linkedinUrl !== undefined
      ? { linkedinUrl: emptyStringToNull(data.linkedinUrl ?? undefined) }
      : {}),
    ...(data.twitterUrl !== undefined
      ? { twitterUrl: emptyStringToNull(data.twitterUrl ?? undefined) }
      : {}),
    ...(data.statementFooterNote !== undefined
      ? { statementFooterNote: emptyStringToNull(data.statementFooterNote ?? undefined) }
      : {}),
    ...(data.bankName !== undefined ? { bankName: emptyStringToNull(data.bankName ?? undefined) } : {}),
    ...(data.accountHolder !== undefined
      ? { accountHolder: emptyStringToNull(data.accountHolder ?? undefined) }
      : {}),
    ...(data.accountNumber !== undefined
      ? { accountNumber: emptyStringToNull(data.accountNumber ?? undefined) }
      : {}),
    ...(data.branchCode !== undefined
      ? { branchCode: emptyStringToNull(data.branchCode ?? undefined) }
      : {}),
    ...(data.accountType !== undefined ? { accountType: data.accountType ?? null } : {}),
  }

  const createDefaults = {
    id: COMPANY_SETTINGS_SINGLETON_ID,
    companyName: DEFAULT_COMPANY_SETTINGS.companyName,
    tagline: null,
    registrationNumber: null,
    vatNumber: null,
    email: null,
    phone: null,
    whatsapp: null,
    address: null,
    website: null,
    instagramUrl: null,
    facebookUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    statementFooterNote: null,
    bankName: null,
    accountHolder: null,
    accountNumber: null,
    branchCode: null,
    accountType: null,
  }

  const row = await prisma.companySettings.upsert({
    where: { id: COMPANY_SETTINGS_SINGLETON_ID },
    update,
    create: { ...createDefaults, ...update },
  })

  return NextResponse.json(toCompanySettingsResponse(row))
}
