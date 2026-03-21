import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUser } from "@/lib/auth/get-user"

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const logs = await prisma.csvImportLog.findMany({
    take: 20,
    orderBy: { created_at: "desc" },
  })

  return NextResponse.json({ logs })
}
