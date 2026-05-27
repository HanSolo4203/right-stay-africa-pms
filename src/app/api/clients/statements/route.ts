import { NextResponse } from "next/server"
import { assertClientsApiAccess } from "@/lib/clients/api-auth"
import {
  loadClientStatementsForPeriod,
  loadClientsWithStatements,
} from "@/lib/clients/statement-service"

export async function GET(request: Request) {
  const user = await assertClientsApiAccess()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = Number(searchParams.get("month"))
  const year = Number(searchParams.get("year"))
  const now = new Date()

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 })
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 })
  }

  const clientId = searchParams.get("clientId")?.trim() || null

  try {
    const clients = clientId
      ? await (async () => {
          const client = await loadClientStatementsForPeriod(clientId, month, year)
          return client ? [client] : []
        })()
      : await loadClientsWithStatements(month, year)
    return NextResponse.json({
      month,
      year,
      clients,
      defaultMonth: now.getMonth() + 1,
      defaultYear: now.getFullYear(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load statements."
    console.error("[clients/statements GET]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
