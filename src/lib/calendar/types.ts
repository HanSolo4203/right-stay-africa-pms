export type CalendarBooking = {
  id: string
  guestName: string
  checkIn: string
  checkOut: string
  platform: string
  status: string
  confirmationCode: string | null
  nights: number
  payout: string | null
  accommodationAmount: string | null
}

export type DayBooking = CalendarBooking & {
  isStart: boolean
  isEnd: boolean
  isContinuing: boolean
}

export type GapDay = {
  date: Date
  gapLength: number
}
