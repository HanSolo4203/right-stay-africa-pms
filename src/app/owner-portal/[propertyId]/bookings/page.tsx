import { OwnerBookingsView } from "@/components/owner-portal/owner-bookings-view"
import { prisma } from "@/lib/prisma"

type OwnerBookingsPageProps = {
  params: Promise<{ propertyId: string }>
}

export default async function OwnerBookingsPage({ params }: OwnerBookingsPageProps) {
  const { propertyId } = await params
  const bookings = await prisma.booking.findMany({
    where: { property_id: propertyId },
    select: {
      id: true,
      guest_name: true,
      check_in: true,
      check_out: true,
      source: true,
      status: true,
    },
    orderBy: [{ check_in: "desc" }],
  })

  return (
    <OwnerBookingsView
      bookings={bookings.map((b) => ({
        ...b,
        check_in: b.check_in.toISOString(),
        check_out: b.check_out.toISOString(),
      }))}
    />
  )
}
