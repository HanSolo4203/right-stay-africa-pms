"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { BookingsTab } from "@/components/properties/bookings-tab"
import { LiveBookingsTab } from "@/components/properties/live-bookings-tab"
import { ListingLinkPreview } from "@/components/properties/listing-link-preview"
import { PropertyAnalyticsCard } from "@/components/properties/property-analytics-card"
import {
  PropertyFinancialsStatementsHistory,
  PropertyFinancialsSummary,
  type PropertyFinancialsStatementItem,
} from "@/components/financials/property-financials-dashboard"
import { ReceiptsList } from "@/components/financials/receipts-list"
import { InfoGuideTab, type PropertyBuildingInfo } from "@/components/info-guide/info-guide-tab"
import { OwnerTab } from "@/components/owners/owner-tab"
import { ContractTab } from "@/components/contracts/contract-tab"
import { PropertyRemoteImage } from "@/components/properties/property-remote-image"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type ReceiptCategoryValue } from "@/lib/types/receipt"

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "owner", label: "Owner" },
  { value: "financials", label: "Financials" },
  { value: "bookings", label: "Bookings" },
  { value: "live-bookings", label: "Live Bookings" },
  { value: "info-guide", label: "Info Guide" },
  { value: "contract", label: "Contract" },
  { value: "photos", label: "Photos" },
] as const

type TabValue = (typeof tabItems)[number]["value"]

type PropertyTabsProps = {
  activeTab: TabValue
  propertyId: string
  clientId: string | null
  userRole: "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER" | null
  statements: PropertyFinancialsStatementItem[]
  receipts: Array<{
    id: string
    date: string
    supplier: string
    amount: string
    category: ReceiptCategoryValue
    file_url: string | null
    file_name: string | null
    notes: string | null
  }>
  owner: {
    full_name: string
    phone: string
    email: string
    id_number: string | null
    bank_name: string | null
    account_number: string | null
    branch_code: string | null
    notes: string | null
    portal_user_id: string | null
  } | null
  infoGuide: {
    wifi_name: string | null
    wifi_password: string | null
    parking_instructions: string | null
    access_code: string | null
    lockbox_code: string | null
    electricity_notes: string | null
    emergency_contacts: Array<{ name: string; phone: string }>
    notes: string | null
  } | null
  buildingInfo: PropertyBuildingInfo
  contracts: Array<{
    id: string
    file_name: string
    file_url: string
    start_date: string
    end_date: string | null
    commission_rate: string
    version: number
    created_at: string
  }>
  overview: {
    description: string | null
    airbnb_listing_url: string | null
    booking_com_listing_url: string | null
    photos: Array<{ id: string; url: string; caption: string | null }>
  }
  bookings: BookingListRow[]
  uplistingLinked: boolean
}

export function isValidPropertyTab(tab: string | undefined): tab is TabValue {
  if (!tab) return false
  return tabItems.some((item) => item.value === tab)
}

function PropertyTabsFallback() {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading property tabs…
    </div>
  )
}

function PropertyTabsInner({
  activeTab,
  propertyId,
  clientId,
  userRole,
  statements,
  receipts,
  owner,
  infoGuide,
  buildingInfo,
  contracts,
  overview,
  bookings,
  uplistingLinked,
}: PropertyTabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  /** Local tab avoids `router.replace` on every switch, which re-ran the full RSC + Prisma load. */
  const [tab, setTab] = useState<TabValue>(activeTab)
  /** Controlled nested tabs avoid Radix sync edge cases under an outer Tabs root. */
  const [financialsSubTab, setFinancialsSubTab] = useState<"summary" | "statements" | "receipts">("summary")

  useEffect(() => {
    setTab(activeTab)
  }, [activeTab])

  const onTabChange = (next: string) => {
    if (!isValidPropertyTab(next)) return

    setTab(next)

    const nextParams = new URLSearchParams(searchParams?.toString() ?? "")
    nextParams.set("tab", next)
    const qs = nextParams.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    window.history.replaceState(window.history.state, "", url)
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="mt-6">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {tabItems.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabItems.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.value === "owner" ? (
            <OwnerTab
              propertyId={propertyId}
              owner={owner}
              portalUserId={owner?.portal_user_id ?? null}
              canManagePortal={userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"}
            />
          ) : tab.value === "info-guide" ? (
            <InfoGuideTab propertyId={propertyId} infoGuide={infoGuide} buildingInfo={buildingInfo} />
          ) : tab.value === "financials" ? (
            <Tabs
              value={financialsSubTab}
              onValueChange={(v) => {
                if (v === "summary" || v === "statements" || v === "receipts") setFinancialsSubTab(v)
              }}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="statements">Statements</TabsTrigger>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
              </TabsList>
              <TabsContent value="summary">
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <PropertyFinancialsSummary
                      propertyId={propertyId}
                      clientId={clientId}
                      statements={statements}
                      userRole={userRole}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="statements">
                <PropertyFinancialsStatementsHistory
                  propertyId={propertyId}
                  clientId={clientId}
                  statements={statements}
                  userRole={userRole}
                />
              </TabsContent>
              <TabsContent value="receipts">
                <ReceiptsList propertyId={propertyId} receipts={receipts} userRole={userRole} />
              </TabsContent>
            </Tabs>
          ) : tab.value === "contract" ? (
            <ContractTab propertyId={propertyId} contracts={contracts} />
          ) : tab.value === "overview" ? (
            <Card className="bg-white">
              <CardContent className="space-y-6 p-6">
                <PropertyAnalyticsCard bookings={bookings} />

                {overview.airbnb_listing_url?.trim() || overview.booking_com_listing_url?.trim() ? (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Live listings</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Link cards open the real listing in a new tab (sites do not allow embedded previews).
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
                      <ListingLinkPreview url={overview.airbnb_listing_url ?? ""} channel="airbnb" />
                      <ListingLinkPreview url={overview.booking_com_listing_url ?? ""} channel="booking" />
                    </div>
                  </div>
                ) : null}

                {overview.description ? (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Description</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {overview.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No description yet.</p>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Photos</h3>
                  {overview.photos.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No photos yet.</p>
                  ) : (
                    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {overview.photos.map((photo) => (
                        <li key={photo.id} className="overflow-hidden rounded-lg border border-slate-200">
                          <PropertyRemoteImage
                            src={photo.url}
                            alt={photo.caption ?? "Property photo"}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          {photo.caption ? (
                            <p className="truncate px-2 py-1 text-xs text-slate-600">{photo.caption}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : tab.value === "bookings" ? (
            <BookingsTab propertyId={propertyId} userRole={userRole} bookings={bookings} />
          ) : tab.value === "live-bookings" ? (
            <LiveBookingsTab propertyId={propertyId} uplistingLinked={uplistingLinked} />
          ) : (
            <Card className="bg-white">
              <CardContent className="p-6 text-slate-500">Coming soon</CardContent>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** `useSearchParams` requires a Suspense boundary in the App Router — see Next.js docs. */
export function PropertyTabs(props: PropertyTabsProps) {
  return (
    <Suspense fallback={<PropertyTabsFallback />}>
      <PropertyTabsInner {...props} />
    </Suspense>
  )
}
