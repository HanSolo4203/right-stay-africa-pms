export type ReportsPeriodKind = "month" | "year" | "custom"

export type ReportsSummaryResponse = {
  period: {
    label: string
    start: string
    end: string
    daysInPeriod: number
  }
  business: {
    totalRevenueManaged: number
    totalManagementFees: number
    totalChannelFees: number
    totalOwnerPayouts: number
    totalExpenses: number
    averageManagementFeeRate: number
    revenuePerProperty: number
    feesPerProperty: number
  }
  feeBreakdown: {
    managementFees: number
    processingFees: number
    channelFees: number
    totalEarned: number
  }
  periodComparison: {
    previous: {
      totalRevenueManaged: number
      totalManagementFees: number
      totalOwnerPayouts: number
      totalBookings: number
    }
    revenueGrowthPct: number
    managementFeesGrowthPct: number
    ownerPayoutsGrowthPct: number
    bookingsGrowthPct: number
  } | null
  portfolio: {
    totalProperties: number
    activeProperties: number
    totalActiveClients: number
    totalBookings: number
    totalNights: number
    averageBookingValue: number
    averageNightlyRate: number
    occupancyRate: number
    topPlatform: string
  }
  monthlyTrend: Array<{
    month: number
    year: number
    label: string
    revenueManaged: number
    managementFees: number
    ownerPayouts: number
    bookingCount: number
    occupancyRate: number
  }>
  platformBreakdown: Array<{
    platform: string
    propertyCount: number
    bookings: number
    nights: number
    revenue: number
    managementFees: number
    channelFees: number
    ownerPayouts: number
    revenueShare: number
    averageCommissionPct: number
    averageBookingValue: number
    averageNightlyRate: number
  }>
  platformMonthlyTrend: Array<{
    month: number
    year: number
    label: string
    platforms: Array<{
      platform: string
      bookings: number
      nights: number
      revenue: number
      channelFees: number
    }>
  }>
  propertyBreakdown: Array<{
    propertyId: string
    propertyName: string
    unitNumber: string | null
    ownerName: string | null
    bookings: number
    nights: number
    occupancyRate: number
    grossRevenue: number
    managementFees: number
    managementFeesOnly: number
    processingFees: number
    channelFees: number
    ownerPayout: number
    additionalExpenses: number
    managementFeeRate: number
    averageNightlyRate: number
    topPlatform: string | null
    revenueShare: number
    platforms: Array<{
      platform: string
      bookings: number
      nights: number
      revenue: number
      managementFees: number
    }>
  }>
  bookingsInPeriod: Array<{
    bookingId: string
    propertyId: string
    propertyName: string
    guestName: string
    platform: string
    checkIn: string
    checkOut: string
    nights: number
    grossRevenue: number
    managementFees: number
    channelFees: number
    ownerPayout: number
  }>
  topProperties: {
    byRevenue: Array<{ propertyId: string; name: string; value: number }>
    byOccupancy: Array<{ propertyId: string; name: string; value: number }>
    byManagementFees: Array<{ propertyId: string; name: string; value: number }>
  }
  yoyComparison: {
    currentPeriodFees: number
    previousPeriodFees: number
    feeGrowthPct: number
    currentRevenue: number
    previousRevenue: number
    revenueGrowthPct: number
  } | null
  generatedAt: string
}
