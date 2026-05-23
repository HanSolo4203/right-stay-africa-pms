import "server-only"

/** A4 landscape height in PDF points. */
export const STATEMENT_PDF_LANDSCAPE_PAGE_HEIGHT = 595.28

/**
 * Max booking rows on page 1 (with header, KPIs, and total).
 * Layout is compacted to fit this many rows on one physical sheet.
 */
export const STATEMENT_PDF_FIRST_PAGE_BOOKING_ROWS = 4

/** Booking rows per continuation page (compact header only). */
export const STATEMENT_PDF_CONTINUATION_BOOKING_ROWS = 11

export function chunkStatementBookings<T>(rows: T[]): T[][] {
  if (rows.length === 0) return [[]]

  const chunks: T[][] = [rows.slice(0, STATEMENT_PDF_FIRST_PAGE_BOOKING_ROWS)]
  let offset = STATEMENT_PDF_FIRST_PAGE_BOOKING_ROWS

  while (offset < rows.length) {
    chunks.push(rows.slice(offset, offset + STATEMENT_PDF_CONTINUATION_BOOKING_ROWS))
    offset += STATEMENT_PDF_CONTINUATION_BOOKING_ROWS
  }

  return chunks
}
