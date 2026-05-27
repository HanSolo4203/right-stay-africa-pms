import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import { FinancialReportPdfDocument } from "@/lib/reports/financial-report-pdf"
import { getOwnerStatementPdfFontFamily } from "@/lib/owner-statement/register-pdf-fonts"

export async function renderFinancialReportPdf(data: ReportsSummaryResponse): Promise<Buffer> {
  getOwnerStatementPdfFontFamily()
  const buffer = await renderToBuffer(<FinancialReportPdfDocument data={data} />)
  return buffer
}
