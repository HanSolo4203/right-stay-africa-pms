import "server-only"

import { prisma } from "@/lib/prisma"

export const COMPANY_SETTINGS_SINGLETON_ID = "singleton"

export type CompanySettingsPdf = {
  companyName: string
  email?: string | null
  phone?: string | null
  website?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  linkedinUrl?: string | null
  twitterUrl?: string | null
  statementFooterNote?: string | null
  bankName?: string | null
  accountHolder?: string | null
  accountNumber?: string | null
  branchCode?: string | null
  accountType?: string | null
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsPdf = {
  companyName: "Right Stay Africa",
  email: null,
  phone: null,
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

export function toCompanySettingsResponse(row: {
  id: string
  companyName: string
  tagline: string | null
  registrationNumber: string | null
  vatNumber: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  website: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  linkedinUrl: string | null
  twitterUrl: string | null
  statementFooterNote: string | null
  bankName: string | null
  accountHolder: string | null
  accountNumber: string | null
  branchCode: string | null
  accountType: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    companyName: row.companyName,
    tagline: row.tagline,
    registrationNumber: row.registrationNumber,
    vatNumber: row.vatNumber,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    address: row.address,
    website: row.website,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    linkedinUrl: row.linkedinUrl,
    twitterUrl: row.twitterUrl,
    statementFooterNote: row.statementFooterNote,
    bankName: row.bankName,
    accountHolder: row.accountHolder,
    accountNumber: row.accountNumber,
    branchCode: row.branchCode,
    accountType: row.accountType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function emptyStringToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export async function getCompanySettingsForPdf(): Promise<CompanySettingsPdf> {
  const row = await prisma.companySettings.findFirst()
  if (!row) {
    return { ...DEFAULT_COMPANY_SETTINGS }
  }
  return {
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    linkedinUrl: row.linkedinUrl,
    twitterUrl: row.twitterUrl,
    statementFooterNote: row.statementFooterNote,
    bankName: row.bankName,
    accountHolder: row.accountHolder,
    accountNumber: row.accountNumber,
    branchCode: row.branchCode,
    accountType: row.accountType,
  }
}
