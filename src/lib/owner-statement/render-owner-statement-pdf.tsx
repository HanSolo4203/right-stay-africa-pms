import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import type { CompanySettingsPdf } from "@/lib/company-settings"
import { OwnerStatementPdfDocument, type OwnerStatementPdfMeta } from "./owner-statement-pdf"
import type { OwnerStatementSnapshotV1 } from "./types"

export async function renderOwnerStatementPdf(
  snapshot: OwnerStatementSnapshotV1,
  meta: OwnerStatementPdfMeta,
  companySettings: CompanySettingsPdf
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <OwnerStatementPdfDocument
      snapshot={snapshot}
      meta={meta}
      companySettings={companySettings}
    />
  )
  return buffer
}
