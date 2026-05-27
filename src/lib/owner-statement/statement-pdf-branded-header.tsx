import "server-only"

import type { ReactNode } from "react"
import { Image, Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import { getOwnerStatementPdfFontFamily, pdfFontBold, pdfFontRegular } from "./register-pdf-fonts"
import {
  STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  STATEMENT_PDF_HEADER_TOP_PADDING,
} from "./statement-pdf-layout"
import { getStatementLogoDataUri } from "./statement-pdf-logo"

const FONT = pdfFontRegular(getOwnerStatementPdfFontFamily())
const FONT_BOLD = pdfFontBold(getOwnerStatementPdfFontFamily())

export const STATEMENT_PDF_BRAND = {
  ink: "#1a1a1a",
  headerBg: "#111c15",
  headerMuted: "#607a68",
  headerSoft: "#7a9b85",
  headerLine: "#2a4a35",
  headerSubtitle: "#8aab94",
  white: "#ffffff",
  stripBg: "#f5f7f5",
  border: "#e0e0e0",
  borderSoft: "#eeeeee",
  muted: "#888888",
  tableAlt: "#fafafa",
  totalBg: "#f0f7f2",
  totalBorder: "#c5dac9",
  accentGreen: "#2d7a4f",
  payoutGreen: "#1a5c35",
  payoutCardBg: "#f2faf5",
} as const

function formatPeriodDate(d: Date): string {
  return `${d.getDate()} ${d.toLocaleDateString("en-ZA", { month: "long" })} ${d.getFullYear()}`
}

export function formatStatementMonthYear(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

export function formatStatementPeriodRange(month: number, year: number): string {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return `${formatPeriodDate(start)} – ${formatPeriodDate(end)}`
}

const headerStyles = {
  bleedHeaderWrap: {
    ...STATEMENT_PDF_BLEED_BLOCK_MARGINS,
    backgroundColor: STATEMENT_PDF_BRAND.headerBg,
    paddingTop: STATEMENT_PDF_HEADER_TOP_PADDING,
  } satisfies Style,
  header: {
    backgroundColor: STATEMENT_PDF_BRAND.headerBg,
    paddingVertical: 22,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  } satisfies Style,
  headerCompact: {
    backgroundColor: STATEMENT_PDF_BRAND.headerBg,
    paddingVertical: 14,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
  } satisfies Style,
  headerRow1: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  } satisfies Style,
  logo: {
    width: 200,
    height: 48,
    objectFit: "contain" as const,
    objectPosition: "left" as const,
  } satisfies Style,
  logoCompact: {
    width: 140,
    height: 34,
    objectFit: "contain" as const,
    objectPosition: "left" as const,
  } satisfies Style,
  periodBlock: {
    alignItems: "flex-end" as const,
  } satisfies Style,
  periodLabel: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 1.5,
    color: STATEMENT_PDF_BRAND.headerMuted,
    textTransform: "uppercase" as const,
  } satisfies Style,
  periodMonth: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    color: STATEMENT_PDF_BRAND.white,
    marginTop: 2,
  } satisfies Style,
  periodMonthCompact: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: STATEMENT_PDF_BRAND.white,
    marginTop: 1,
  } satisfies Style,
  periodRange: {
    fontFamily: FONT,
    fontSize: 10,
    color: STATEMENT_PDF_BRAND.headerSoft,
    marginTop: 2,
  } satisfies Style,
  periodRangeCompact: {
    fontFamily: FONT,
    fontSize: 8.5,
    color: STATEMENT_PDF_BRAND.headerSoft,
    marginTop: 1,
  } satisfies Style,
  headerRow2: {
    marginTop: 16,
  } satisfies Style,
  headerRow2Compact: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: STATEMENT_PDF_BRAND.headerLine,
  } satisfies Style,
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: STATEMENT_PDF_BRAND.white,
  } satisfies Style,
  titleCompact: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: STATEMENT_PDF_BRAND.white,
  } satisfies Style,
  subtitle: {
    fontFamily: FONT,
    fontSize: 11,
    color: STATEMENT_PDF_BRAND.headerSubtitle,
    marginTop: 2,
  } satisfies Style,
  subtitleCompact: {
    fontFamily: FONT,
    fontSize: 9.5,
    color: STATEMENT_PDF_BRAND.headerSoft,
    marginTop: 2,
  } satisfies Style,
  headerRow3: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: STATEMENT_PDF_BRAND.headerLine,
  } satisfies Style,
  metaLabel: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 1.5,
    color: STATEMENT_PDF_BRAND.headerMuted,
    textTransform: "uppercase" as const,
  } satisfies Style,
  metaValue: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: STATEMENT_PDF_BRAND.white,
    marginTop: 2,
  } satisfies Style,
  zarNote: {
    fontFamily: FONT,
    fontSize: 9,
    color: STATEMENT_PDF_BRAND.headerMuted,
  } satisfies Style,
  kpiStripBleed: {
    ...STATEMENT_PDF_BLEED_BLOCK_MARGINS,
  } satisfies Style,
  kpiStrip: {
    backgroundColor: STATEMENT_PDF_BRAND.stripBg,
    paddingVertical: 14,
    paddingHorizontal: STATEMENT_PDF_BLEED_CONTENT_HORIZONTAL_PADDING,
    borderBottomWidth: 0.5,
    borderBottomColor: STATEMENT_PDF_BRAND.border,
    flexDirection: "row" as const,
    gap: 8,
  } satisfies Style,
  kpiCard: {
    flex: 1,
    backgroundColor: STATEMENT_PDF_BRAND.white,
    borderWidth: 0.5,
    borderColor: STATEMENT_PDF_BRAND.border,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  } satisfies Style,
  kpiCardAccent: {
    backgroundColor: STATEMENT_PDF_BRAND.payoutCardBg,
    borderColor: STATEMENT_PDF_BRAND.accentGreen,
  } satisfies Style,
  kpiLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 1,
    color: STATEMENT_PDF_BRAND.muted,
    textTransform: "uppercase" as const,
    marginBottom: 5,
  } satisfies Style,
  kpiValue: {
    fontFamily: FONT_BOLD,
    fontSize: 17,
    color: STATEMENT_PDF_BRAND.ink,
    lineHeight: 1.2,
  } satisfies Style,
  kpiValueAccent: {
    color: STATEMENT_PDF_BRAND.payoutGreen,
  } satisfies Style,
  kpiSub: {
    fontFamily: FONT,
    fontSize: 9,
    color: STATEMENT_PDF_BRAND.muted,
    marginTop: 3,
  } satisfies Style,
} as const

export function StatementPdfKpiStrip({
  children,
}: {
  children: ReactNode
}) {
  return (
    <View style={headerStyles.kpiStripBleed} wrap={false}>
      <View style={headerStyles.kpiStrip}>{children}</View>
    </View>
  )
}

export function StatementPdfKpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <View
      style={[
        headerStyles.kpiCard,
        ...(accent ? [headerStyles.kpiCardAccent] : []),
      ]}
    >
      <Text style={headerStyles.kpiLabel}>{label}</Text>
      <Text
        style={[
          headerStyles.kpiValue,
          ...(accent ? [headerStyles.kpiValueAccent] : []),
        ]}
      >
        {value}
      </Text>
      <Text style={headerStyles.kpiSub}>{sub}</Text>
    </View>
  )
}

export function StatementPdfBrandedHeader({
  statementLabel,
  periodLabel,
  periodRange,
  title,
  subtitle,
  metaLeftLabel,
  metaLeftValue,
  metaRight = "All amounts in ZAR",
  variant = "primary",
}: {
  statementLabel: string
  periodLabel: string
  periodRange: string
  title: string
  subtitle?: string | null
  metaLeftLabel?: string
  metaLeftValue?: string
  metaRight?: string
  variant?: "primary" | "compact"
}) {
  const compact = variant === "compact"

  return (
    <>
      <View style={headerStyles.bleedHeaderWrap} wrap={false}>
        <View style={compact ? headerStyles.headerCompact : headerStyles.header}>
          <View style={headerStyles.headerRow1}>
            <Image
              src={getStatementLogoDataUri()}
              style={compact ? headerStyles.logoCompact : headerStyles.logo}
            />
            <View style={headerStyles.periodBlock}>
              <Text style={headerStyles.periodLabel}>{statementLabel}</Text>
              <Text style={compact ? headerStyles.periodMonthCompact : headerStyles.periodMonth}>
                {periodLabel}
              </Text>
              <Text style={compact ? headerStyles.periodRangeCompact : headerStyles.periodRange}>
                {periodRange}
              </Text>
            </View>
          </View>
          <View style={compact ? headerStyles.headerRow2Compact : headerStyles.headerRow2}>
            <Text style={compact ? headerStyles.titleCompact : headerStyles.title}>{title}</Text>
            {subtitle ? (
              <Text style={compact ? headerStyles.subtitleCompact : headerStyles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {metaLeftLabel && metaLeftValue ? (
            <View style={headerStyles.headerRow3}>
              <View>
                <Text style={headerStyles.metaLabel}>{metaLeftLabel}</Text>
                <Text style={headerStyles.metaValue}>{metaLeftValue}</Text>
              </View>
              <Text style={headerStyles.zarNote}>{metaRight}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </>
  )
}
