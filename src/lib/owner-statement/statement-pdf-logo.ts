import "server-only"


import fs from "node:fs"
import path from "node:path"

const STATEMENT_LOGO_FILE = "RSA NEW WHT BG Cropped.png"

let statementLogoDataUri: string | null = null

export function getStatementLogoDataUri(): string {
  if (statementLogoDataUri) return statementLogoDataUri
  const filePath = path.join(process.cwd(), "public", STATEMENT_LOGO_FILE)
  const buf = fs.readFileSync(filePath)
  statementLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`
  return statementLogoDataUri
}
