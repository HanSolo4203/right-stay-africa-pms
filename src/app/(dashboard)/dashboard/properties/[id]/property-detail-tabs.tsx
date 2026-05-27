import { notFound } from "next/navigation"
import { PropertyTabs } from "@/components/properties/property-tabs"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"
import { parseEmergencyContacts, type PropertyTab } from "./property-detail-shared"

export async function PropertyDetailTabs({
  propertyId,
  activeTab,
}: {
  propertyId: string
  activeTab: PropertyTab
}) {
  const [property, user] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        client_id: true,
        name: true,
        unit_number: true,
        building_name: true,
        building_manager_email: true,
        building_manager_phone: true,
        description: true,
        airbnb_listing_url: true,
        booking_com_listing_url: true,
        right_stay_commission_percent: true,
        welcome_pack_fee: true,
        uplisting_id: true,
        owner: {
          select: {
            full_name: true,
            phone: true,
            email: true,
            id_number: true,
            bank_name: true,
            account_number: true,
            branch_code: true,
            notes: true,
            portal_user_id: true,
          },
        },
        info_guide: {
          select: {
            wifi_name: true,
            wifi_password: true,
            parking_instructions: true,
            access_code: true,
            lockbox_code: true,
            electricity_notes: true,
            emergency_contacts: true,
            notes: true,
          },
        },
        statements: {
          select: {
            id: true,
            month: true,
            year: true,
            file_name: true,
            file_url: true,
            notes: true,
            created_at: true,
            source: true,
            status: true,
            snapshot: true,
          },
          orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
        },
        receipts: {
          select: {
            id: true,
            date: true,
            supplier: true,
            amount: true,
            category: true,
            file_url: true,
            file_name: true,
            notes: true,
          },
          orderBy: [{ date: "desc" }],
        },
        contracts: {
          select: {
            id: true,
            file_name: true,
            file_url: true,
            start_date: true,
            end_date: true,
            commission_rate: true,
            version: true,
            created_at: true,
          },
          orderBy: [{ created_at: "desc" }],
        },
        photos: {
          select: {
            id: true,
            url: true,
            caption: true,
            is_cover: true,
            created_at: true,
          },
          orderBy: [{ is_cover: "desc" }, { created_at: "asc" }],
        },
        bookings: {
          select: {
            id: true,
            guest_name: true,
            check_in: true,
            check_out: true,
            num_guests: true,
            source: true,
            status: true,
            total: true,
            nightly_rate: true,
            notes: true,
            channel_name: true,
            uplisting_id: true,
            csv_imported_at: true,
            accommodation_total: true,
            discount: true,
            extra_guest_charge: true,
            cleaning_fee: true,
            extra_charges: true,
            upsells: true,
            booking_taxes: true,
            commission: true,
            commission_tax: true,
            total_management_fee: true,
            payment_processing_fee: true,
            total_payout: true,
            gross_revenue: true,
            net_revenue: true,
            confirmation_code: true,
            owner_statement_id: true,
          },
          orderBy: [{ check_in: "asc" }],
        },
      },
    }),
    getUser(),
  ])

  if (!property) {
    notFound()
  }

  return (
    <PropertyTabs
      activeTab={activeTab}
      propertyId={property.id}
      clientId={property.client_id}
      owner={property.owner}
      infoGuide={
        property.info_guide
          ? {
              wifi_name: property.info_guide.wifi_name,
              wifi_password: property.info_guide.wifi_password,
              parking_instructions: property.info_guide.parking_instructions,
              access_code: property.info_guide.access_code,
              lockbox_code: property.info_guide.lockbox_code,
              electricity_notes: property.info_guide.electricity_notes,
              emergency_contacts: parseEmergencyContacts(property.info_guide.emergency_contacts),
              notes: property.info_guide.notes,
            }
          : null
      }
      buildingInfo={{
        unit_number: property.unit_number,
        building_name: property.building_name,
        building_manager_email: property.building_manager_email,
        building_manager_phone: property.building_manager_phone,
      }}
      userRole={user?.role ?? null}
      statements={property.statements.map((item) => ({
        id: item.id,
        month: item.month,
        year: item.year,
        file_name: item.file_name,
        file_url: item.file_url,
        notes: item.notes,
        created_at: item.created_at.toISOString(),
        source: item.source,
        status: item.status,
        snapshot: item.snapshot,
      }))}
      receipts={property.receipts.map((item) => ({
        ...item,
        date: item.date.toISOString().split("T")[0] ?? "",
        amount: item.amount.toString(),
      }))}
      contracts={property.contracts.map((item) => ({
        ...item,
        start_date: item.start_date.toISOString(),
        end_date: item.end_date?.toISOString() ?? null,
        created_at: item.created_at.toISOString(),
      }))}
      overview={{
        description: property.description,
        airbnb_listing_url: property.airbnb_listing_url,
        booking_com_listing_url: property.booking_com_listing_url,
        photos: property.photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption,
        })),
      }}
      bookings={property.bookings.map((booking) => ({
        id: booking.id,
        guest_name: booking.guest_name,
        check_in: booking.check_in.toISOString(),
        check_out: booking.check_out.toISOString(),
        num_guests: booking.num_guests,
        source: booking.source,
        status: booking.status,
        total: booking.total.toString(),
        nightly_rate: booking.nightly_rate.toString(),
        notes: booking.notes,
        channel_name: booking.channel_name,
        uplisting_id: booking.uplisting_id,
        csv_imported_at: booking.csv_imported_at?.toISOString() ?? null,
        accommodation_total: booking.accommodation_total?.toString() ?? null,
        discount: booking.discount?.toString() ?? null,
        extra_guest_charge: booking.extra_guest_charge?.toString() ?? null,
        cleaning_fee: booking.cleaning_fee?.toString() ?? null,
        extra_charges: booking.extra_charges?.toString() ?? null,
        upsells: booking.upsells?.toString() ?? null,
        booking_taxes: booking.booking_taxes?.toString() ?? null,
        commission: booking.commission?.toString() ?? null,
        commission_tax: booking.commission_tax?.toString() ?? null,
        total_management_fee: booking.total_management_fee?.toString() ?? null,
        payment_processing_fee: booking.payment_processing_fee?.toString() ?? null,
        total_payout: booking.total_payout?.toString() ?? null,
        gross_revenue: booking.gross_revenue?.toString() ?? null,
        net_revenue: booking.net_revenue?.toString() ?? null,
        confirmation_code: booking.confirmation_code,
        owner_statement_id: booking.owner_statement_id,
      }))}
      uplistingLinked={Boolean(property.uplisting_id?.trim())}
    />
  )
}
