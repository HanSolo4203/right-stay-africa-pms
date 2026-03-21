import { StatementSource, StatementStatus } from "@prisma/client"
import { OwnerStatementsList } from "@/components/owner-portal/owner-statements-list"
import { prisma } from "@/lib/prisma"

type OwnerStatementsPageProps = {
  params: Promise<{ propertyId: string }>
}

export default async function OwnerStatementsPage({ params }: OwnerStatementsPageProps) {
  const { propertyId } = await params
  const statements = await prisma.statement.findMany({
    where: {
      property_id: propertyId,
      file_url: { not: null },
      OR: [
        { source: StatementSource.UPLOADED },
        {
          source: StatementSource.GENERATED,
          status: StatementStatus.FINAL,
        },
      ],
    },
    select: {
      id: true,
      month: true,
      year: true,
      file_name: true,
      file_url: true,
      notes: true,
      created_at: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
  })

  return (
    <OwnerStatementsList
      statements={statements.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
      }))}
    />
  )
}
