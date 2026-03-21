import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import { OwnerStatementPdfDocument, type OwnerStatementPdfMeta } from "./owner-statement-pdf"
import type { OwnerStatementSnapshotV1 } from "./types"

export async function renderOwnerStatementPdf(
  snapshot: OwnerStatementSnapshotV1,
  meta: OwnerStatementPdfMeta
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <OwnerStatementPdfDocument snapshot={snapshot} meta={meta} />
  )
  return buffer
}
