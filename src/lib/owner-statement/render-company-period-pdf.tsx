import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import type { PortfolioPeriodSummary } from "@/lib/clients/portfolio-period-summary"
import type { CompanySettingsPdf } from "@/lib/company-settings"
import { CompanyPeriodStatementPdfDocument } from "./company-period-statement-pdf"

export async function renderCompanyPeriodStatementPdf(
  summary: PortfolioPeriodSummary,
  companySettings: CompanySettingsPdf
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <CompanyPeriodStatementPdfDocument summary={summary} companySettings={companySettings} />
  )
  return buffer
}
