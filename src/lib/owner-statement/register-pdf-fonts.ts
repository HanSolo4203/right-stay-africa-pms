import "server-only"

import fs from "node:fs"
import path from "node:path"
import { Font } from "@react-pdf/renderer"

export type OwnerStatementPdfFontFamily = "Arial" | "Helvetica"

const fontCache: { family?: OwnerStatementPdfFontFamily } = {}

function registerBuiltInHelvetica(): OwnerStatementPdfFontFamily {
  return "Helvetica"
}

/**
 * Register Arimo TTF from `public/fonts` (Arial-compatible). Falls back to built-in Helvetica
 * when files are missing or registration fails (e.g. hot-reload double register).
 */
export function getOwnerStatementPdfFontFamily(): OwnerStatementPdfFontFamily {
  if (fontCache.family) return fontCache.family

  const regular = path.join(process.cwd(), "public/fonts/Arimo-Regular.ttf")
  const bold = path.join(process.cwd(), "public/fonts/Arimo-Bold.ttf")

  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    fontCache.family = registerBuiltInHelvetica()
    return fontCache.family
  }

  try {
    Font.register({
      family: "Arial",
      fonts: [
        { src: regular, fontWeight: 400, fontStyle: "normal" },
        // No separate italic TTF — map italic to regular so react-pdf can resolve the family.
        { src: regular, fontWeight: 400, fontStyle: "italic" },
        { src: bold, fontWeight: 700, fontStyle: "normal" },
        { src: bold, fontWeight: 700, fontStyle: "italic" },
      ],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!/already\s+registered/i.test(msg)) {
      fontCache.family = registerBuiltInHelvetica()
      return fontCache.family
    }
  }

  try {
    Font.registerHyphenationCallback((word) => [word])
  } catch {
    // ignore if already set
  }

  fontCache.family = "Arial"
  return fontCache.family
}

export function pdfFontRegular(family: OwnerStatementPdfFontFamily): string {
  return family
}

export function pdfFontBold(family: OwnerStatementPdfFontFamily): string {
  return family === "Helvetica" ? "Helvetica-Bold" : family
}
