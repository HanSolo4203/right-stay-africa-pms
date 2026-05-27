export type DashboardKpiMonth = {
  grossRevenue: number
  managementFees: number
  ownerPayouts: number
  bookingCount: number
  bookedNights: number
  availableNights: number
  occupancyRate: number
}

export type DashboardKpiMonthSummary = {
  grossRevenue: number
  managementFees: number
  ownerPayouts: number
  bookingCount: number
  occupancyRate: number
}

export type DashboardApiResponse = {
  kpis: {
    currentMonth: DashboardKpiMonth
    lastMonth: DashboardKpiMonthSummary
  }
  portfolio: {
    totalProperties: number
    activeClients: number
    propertiesWithBookingsThisMonth: number
    propertiesWithNoBookingsThisMonth: number
  }
  upcoming: {
    checkinsNext7Days: DashboardUpcomingStay[]
    checkoutsNext7Days: DashboardUpcomingStay[]
  }
  propertyBreakdown: DashboardPropertyRow[]
  attention: DashboardAttentionItem[]
  revenueByPlatform: DashboardPlatformRevenue[]
  revenueTrend: DashboardRevenueTrendPoint[]
  generatedAt: string
}

export type DashboardUpcomingStay = {
  bookingId: string
  guestName: string
  propertyName: string
  propertyId: string
  checkIn: string
  checkOut: string
  nights: number
  platform: string
}

export type DashboardPropertyStatus = "occupied" | "vacant" | "check-in" | "check-out"

export type DashboardPropertyRow = {
  propertyId: string
  propertyName: string
  ownerName: string | null
  unitNumber: string | null
  bookingCount: number
  bookedNights: number
  daysInMonth: number
  occupancyRate: number
  grossRevenue: number
  managementFee: number
  ownerPayout: number
  currentGuest: string | null
  nextCheckin: string | null
  platform: string | null
  status: DashboardPropertyStatus
}

export type DashboardAttentionItem = {
  propertyId: string
  propertyName: string
  issue: string
}

export type DashboardPlatformRevenue = {
  platform: string
  revenue: number
  bookings: number
  percentage: number
}

export type DashboardRevenueTrendPoint = {
  month: string
  grossRevenue: number
  managementFees: number
  ownerPayouts: number
}

export type DashboardActivityItem = {
  id: string
  timeLabel: string
  description: string
  accent: "primary" | "info" | "success" | "warning" | "danger"
}
