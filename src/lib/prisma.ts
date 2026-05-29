import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { assertServerEnvConfigured } from "@/lib/required-env"

assertServerEnvConfigured()
const connectionString = process.env.DATABASE_URL!

const adapter = new PrismaPg({ connectionString })

/** Bump when Client/Property schema changes so dev HMR does not reuse a stale PrismaClient. */
const PRISMA_SCHEMA_VERSION = 9

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaVersion: number | undefined
}

/** Dev HMR can keep an old PrismaClient instance after `prisma generate` adds new fields/models. */
function isPrismaClientComplete(client: PrismaClient): boolean {
  if (globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION) return false
  const c = client as PrismaClient & {
    client?: { findMany: unknown }
    statementExpense?: { findMany: unknown }
    companySettings?: { findFirst: unknown }
    propertyCleaningMonthRecord?: { upsert: unknown }
    cleaningTask?: { findMany: unknown }
  }
  return (
    typeof c.client?.findMany === "function" &&
    typeof c.statementExpense?.findMany === "function" &&
    typeof c.companySettings?.findFirst === "function" &&
    typeof c.propertyCleaningMonthRecord?.upsert === "function" &&
    typeof c.cleaningTask?.findMany === "function"
  )
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter })
}

function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && isPrismaClientComplete(cached)) {
    return cached
  }
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION
  }
  return client
}

/** Lazy singleton so a dev server started before `prisma generate` picks up new models on reload. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrisma(), prop, receiver)
  },
})

