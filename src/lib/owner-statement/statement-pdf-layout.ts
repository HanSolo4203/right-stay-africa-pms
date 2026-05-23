import "server-only"

/**
 * Printable safe zone from the physical page edge (~5 mm at 72 dpi).
 * Applied to wrapped content so overflow pages keep margin when printed.
 */
export const STATEMENT_PDF_SAFE_INSET = 14

/** Approximate height of one table data row (guest + amounts). */
const STATEMENT_PDF_TABLE_ROW_HEIGHT = 56

/** Minimum visible space below a row before breaking (row height + print safe inset). */
export const STATEMENT_PDF_TABLE_ROW_MIN_PRESENCE =
  STATEMENT_PDF_TABLE_ROW_HEIGHT + STATEMENT_PDF_SAFE_INSET

/** Minimum space to keep a section block (heading + table header) on one page fragment. */
export const STATEMENT_PDF_SECTION_MIN_PRESENCE = 88 + STATEMENT_PDF_SAFE_INSET

/** Minimum space for the financial summary / payout block. */
export const STATEMENT_PDF_SUMMARY_MIN_PRESENCE = 120 + STATEMENT_PDF_SAFE_INSET

/** Height of the fixed footer band (border + text). */
export const STATEMENT_PDF_FOOTER_HEIGHT = 28

/** Gap between flowing body content and the fixed footer. */
export const STATEMENT_PDF_FOOTER_CONTENT_GAP = 10

/** Page `paddingBottom` — keeps wrapped content above the fixed footer and bleed. */
export const STATEMENT_PDF_FOOTER_RESERVE =
  STATEMENT_PDF_FOOTER_HEIGHT + STATEMENT_PDF_FOOTER_CONTENT_GAP + STATEMENT_PDF_SAFE_INSET

/** Horizontal inset for footer text alignment with body safe zone. */
export const STATEMENT_PDF_FOOTER_HORIZONTAL_INSET = 32 + STATEMENT_PDF_SAFE_INSET

/** Distance of fixed footer from physical page bottom. */
export const STATEMENT_PDF_FOOTER_BOTTOM = 14 + STATEMENT_PDF_SAFE_INSET
