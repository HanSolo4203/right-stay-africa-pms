import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { prisma } from "@/lib/prisma"

export default async function OwnersPage() {
  const owners = await prisma.owner.findMany({
    include: {
      property: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  })

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Owners</h2>
        <p className="mt-1 text-sm text-slate-600">All owners linked to properties.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Portal</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {owners.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                No owners found.
              </TableCell>
            </TableRow>
          ) : (
            owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>{owner.full_name}</TableCell>
                <TableCell>{owner.email}</TableCell>
                <TableCell>{owner.phone}</TableCell>
                <TableCell>{owner.property.name}</TableCell>
                <TableCell>
                  {owner.portal_user_id ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Linked</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-600">
                      Not linked
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/properties/${owner.property.id}/owner-portal`}>Portal</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/properties/${owner.property.id}?tab=owner`}>View</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  )
}
