/**
 * Minimal RFC 4180–style CSV parser (quoted fields, escaped quotes).
 */
export function parseCsvMatrix(content: string): string[][] {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let i = 0
  let inQuotes = false

  while (i < text.length) {
    const c = text[i]!

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }

    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ",") {
      row.push(field)
      field = ""
      i += 1
      continue
    }
    if (c === "\r") {
      i += 1
      continue
    }
    if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i += 1
      continue
    }

    field += c
    i += 1
  }

  row.push(field)
  if (row.some((cell) => cell.length > 0) || row.length > 1) {
    rows.push(row)
  }

  return rows
}

export function parseCsvRecords(content: string): Record<string, string>[] {
  const matrix = parseCsvMatrix(content)
  if (matrix.length < 2) {
    return []
  }

  const rawHeaders = matrix[0]!.map((h) => h.trim())
  const records: Record<string, string>[] = []

  for (let r = 1; r < matrix.length; r += 1) {
    const cells = matrix[r]!
    const rec: Record<string, string> = {}
    for (let c = 0; c < rawHeaders.length; c += 1) {
      const key = rawHeaders[c]
      if (!key) continue
      rec[key] = (cells[c] ?? "").trim()
    }
    records.push(rec)
  }

  return records
}
