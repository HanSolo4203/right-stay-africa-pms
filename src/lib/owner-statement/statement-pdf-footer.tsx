import "server-only"

import { Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import type { CompanySettingsPdf } from "@/lib/company-settings"
import { getOwnerStatementPdfFontFamily, pdfFontBold, pdfFontRegular } from "./register-pdf-fonts"
import {
  STATEMENT_PDF_FOOTER_BOTTOM,
  STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
} from "./statement-pdf-layout"

const FONT = pdfFontRegular(getOwnerStatementPdfFontFamily())
const FONT_BOLD = pdfFontBold(getOwnerStatementPdfFontFamily())

export const STATEMENT_PDF_COMPANY_NAME = "Right Stay Africa"

/** Override with `COMPANY_CONTACT_EMAIL` in environment. */
export function getStatementPdfCompanyEmail(): string {
  const fromEnv = process.env.COMPANY_CONTACT_EMAIL?.trim()
  return fromEnv || "info@rightstay.africa"
}

export {
  STATEMENT_PDF_FOOTER_RESERVE,
  STATEMENT_PDF_FOOTER_BOTTOM,
  STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
} from "./statement-pdf-layout"

function stripUrlProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "")
}

function formatAccountTypeLabel(value: string | null | undefined): string {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function hasRichFooterContent(companySettings: CompanySettingsPdf): boolean {
  return Boolean(
    companySettings.email?.trim() ||
      companySettings.phone?.trim() ||
      companySettings.website?.trim() ||
      companySettings.instagramUrl?.trim() ||
      companySettings.facebookUrl?.trim() ||
      companySettings.linkedinUrl?.trim() ||
      companySettings.twitterUrl?.trim() ||
      companySettings.bankName?.trim() ||
      companySettings.statementFooterNote?.trim()
  )
}

const footerStyles = {
  root: {
    position: "absolute" as const,
    bottom: STATEMENT_PDF_FOOTER_BOTTOM,
    left: STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
    right: STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
  } satisfies Style,
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  } satisfies Style,
  row1: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
  } satisfies Style,
  row2: {
    paddingVertical: 8,
  } satisfies Style,
  row3: {
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  } satisfies Style,
  contactRow: {
    flexDirection: "row" as const,
    gap: 16,
    flexWrap: "wrap" as const,
    maxWidth: "70%",
  } satisfies Style,
  contactItem: {
    fontFamily: FONT,
    fontSize: 9,
    color: "#888888",
  } satisfies Style,
  social: {
    fontFamily: FONT,
    fontSize: 9,
    color: "#888888",
    textAlign: "right" as const,
    maxWidth: "40%",
  } satisfies Style,
  banking: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#aaaaaa",
    maxWidth: "72%",
    lineHeight: 1.35,
  } satisfies Style,
  brandRight: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    color: "#666666",
    textAlign: "right" as const,
  } satisfies Style,
  footerNote: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#aaaaaa",
    fontStyle: "italic" as const,
    maxWidth: "70%",
    lineHeight: 1.35,
  } satisfies Style,
  meta: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#aaaaaa",
    maxWidth: "58%",
    textAlign: "right" as const,
    lineHeight: 1.35,
  } satisfies Style,
  simpleLeftCol: {
    gap: 2,
  } satisfies Style,
  simpleBrand: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#888888",
  } satisfies Style,
  simpleEmail: {
    fontFamily: FONT,
    fontSize: 7.5,
    color: "#888888",
  } satisfies Style,
  simpleMeta: {
    fontFamily: FONT,
    fontSize: 7.5,
    color: "#888888",
    maxWidth: "58%",
    textAlign: "right" as const,
    lineHeight: 1.35,
  } satisfies Style,
  simpleRoot: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  } satisfies Style,
}

function buildSocialLabels(companySettings: CompanySettingsPdf): string {
  const labels: string[] = []
  if (companySettings.instagramUrl?.trim()) labels.push("Instagram")
  if (companySettings.facebookUrl?.trim()) labels.push("Facebook")
  if (companySettings.linkedinUrl?.trim()) labels.push("LinkedIn")
  if (companySettings.twitterUrl?.trim()) labels.push("X")
  return labels.join(" · ")
}

function buildBankingLine(companySettings: CompanySettingsPdf): string | null {
  if (!companySettings.bankName?.trim()) return null
  const parts = [
    `Management fee payments: ${companySettings.bankName.trim()}`,
    companySettings.accountHolder?.trim(),
    companySettings.accountNumber?.trim()
      ? `Acc: ${companySettings.accountNumber.trim()}`
      : null,
    companySettings.branchCode?.trim()
      ? `Branch: ${companySettings.branchCode.trim()}`
      : null,
    formatAccountTypeLabel(companySettings.accountType),
  ].filter(Boolean)
  return parts.join(" · ")
}

export function StatementPdfFooter({
  generatedDate,
  backgroundColor,
  metaSuffix = "Reflects CSV import data and expenses recorded in the PMS",
  companySettings,
}: {
  generatedDate: string
  backgroundColor: string
  metaSuffix?: string
  companySettings?: CompanySettingsPdf
}) {
  const settings = companySettings ?? { companyName: STATEMENT_PDF_COMPANY_NAME }
  const companyName = settings.companyName?.trim() || STATEMENT_PDF_COMPANY_NAME

  if (!hasRichFooterContent(settings)) {
    const email = settings.email?.trim() || getStatementPdfCompanyEmail()
    return (
      <View fixed style={[footerStyles.root, { backgroundColor }]}>
        <View style={footerStyles.simpleRoot}>
          <View style={footerStyles.simpleLeftCol}>
            <Text style={footerStyles.simpleBrand}>{companyName}</Text>
            <Text style={footerStyles.simpleEmail}>{email}</Text>
          </View>
          <Text style={footerStyles.simpleMeta}>
            Generated {generatedDate} · {metaSuffix}
          </Text>
        </View>
      </View>
    )
  }

  const socialLabels = buildSocialLabels(settings)
  const bankingLine = buildBankingLine(settings)

  return (
    <View fixed style={[footerStyles.root, { backgroundColor }]}>
      <View style={[footerStyles.row, footerStyles.row1]}>
        <View style={footerStyles.contactRow}>
          {settings.email?.trim() ? (
            <Text style={footerStyles.contactItem}>{settings.email.trim()}</Text>
          ) : null}
          {settings.phone?.trim() ? (
            <Text style={footerStyles.contactItem}>{settings.phone.trim()}</Text>
          ) : null}
          {settings.website?.trim() ? (
            <Text style={footerStyles.contactItem}>
              {stripUrlProtocol(settings.website.trim())}
            </Text>
          ) : null}
        </View>
        {socialLabels ? <Text style={footerStyles.social}>{socialLabels}</Text> : <Text> </Text>}
      </View>

      <View style={[footerStyles.row, footerStyles.row2]}>
        {bankingLine ? (
          <Text style={footerStyles.banking}>{bankingLine}</Text>
        ) : (
          <Text> </Text>
        )}
        <Text style={footerStyles.brandRight}>{companyName}</Text>
      </View>

      <View style={[footerStyles.row, footerStyles.row3]}>
        {settings.statementFooterNote?.trim() ? (
          <Text style={footerStyles.footerNote}>{settings.statementFooterNote.trim()}</Text>
        ) : (
          <Text> </Text>
        )}
        <Text style={footerStyles.meta}>
          Generated {generatedDate} · {metaSuffix}
        </Text>
      </View>
    </View>
  )
}
