import "server-only"

import { aggregatePortfolioFromClients } from "@/lib/clients/portfolio-period-summary"
import { loadClientsWithStatements } from "@/lib/clients/statement-service"

export async function aggregatePortfolioPeriod(month: number, year: number) {
  const clients = await loadClientsWithStatements(month, year)
  return aggregatePortfolioFromClients(clients, month, year)
}
