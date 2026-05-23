import "server-only"

import { Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import { getOwnerStatementPdfFontFamily, pdfFontRegular } from "./register-pdf-fonts"
import {
  STATEMENT_PDF_FOOTER_BOTTOM,
  STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
} from "./statement-pdf-layout"

const FONT = pdfFontRegular(getOwnerStatementPdfFontFamily())

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

const footerStyles = {
  root: {
    position: "absolute" as const,
    bottom: STATEMENT_PDF_FOOTER_BOTTOM,
    left: STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
    right: STATEMENT_PDF_FOOTER_HORIZONTAL_INSET,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  } satisfies Style,
  leftCol: {
    gap: 2,
  } satisfies Style,
  brand: {
    fontFamily: FONT,
    fontSize: 8,
    color: "#888888",
  } satisfies Style,
  email: {
    fontFamily: FONT,
    fontSize: 7.5,
    color: "#888888",
  } satisfies Style,
  meta: {
    fontFamily: FONT,
    fontSize: 7.5,
    color: "#888888",
    maxWidth: "58%",
    textAlign: "right" as const,
    lineHeight: 1.35,
  } satisfies Style,
}

export function StatementPdfFooter({
  generatedDate,
  backgroundColor,
  metaSuffix = "Reflects CSV import data and expenses recorded in the PMS",
}: {
  generatedDate: string
  backgroundColor: string
  metaSuffix?: string
}) {
  const email = getStatementPdfCompanyEmail()

  return (
    <View fixed style={[footerStyles.root, { backgroundColor }]}>
      <View style={footerStyles.leftCol}>
        <Text style={footerStyles.brand}>{STATEMENT_PDF_COMPANY_NAME}</Text>
        <Text style={footerStyles.email}>{email}</Text>
      </View>
      <Text style={footerStyles.meta}>
        Generated {generatedDate} · {metaSuffix}
      </Text>
    </View>
  )
}
