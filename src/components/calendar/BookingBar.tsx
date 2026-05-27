"use client"

import type { ReactElement } from "react"
import { BookingStatus } from "@prisma/client"
import { BookingHoverContent } from "@/components/calendar/booking-hover-content"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { getPlatformColor } from "@/lib/calendar-utils"
import type { CalendarBooking } from "@/lib/calendar/types"
import { cn } from "@/lib/utils"

type BookingBarBaseProps = {
  booking: CalendarBooking
  propertyName?: string
  isSelected?: boolean
  isHovered?: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

type TimelineBookingBarProps = BookingBarBaseProps & {
  variant: "timeline"
  left: string
  width: string
  lane?: number
  showLabel?: boolean
}

type GridBookingBarProps = BookingBarBaseProps & {
  variant: "grid"
  gridColumn: string
  gridRow: number
  isStart: boolean
  isEnd: boolean
}

export type BookingBarProps = TimelineBookingBarProps | GridBookingBarProps

function BookingBarWithHover({
  booking,
  propertyName,
  children,
}: {
  booking: CalendarBooking
  propertyName?: string
  children: ReactElement
}) {
  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" collisionPadding={8}>
        <BookingHoverContent booking={booking} propertyName={propertyName} />
      </HoverCardContent>
    </HoverCard>
  )
}

export function BookingBar(props: BookingBarProps) {
  const { booking, propertyName, isSelected, isHovered, onClick, onMouseEnter, onMouseLeave } = props
  const color = getPlatformColor(booking.platform)
  const isCancelled = booking.status === BookingStatus.CANCELLED

  if (props.variant === "timeline") {
    const lane = props.lane ?? 0
    const showLabel = props.showLabel ?? true
    const LANE_HEIGHT = 22
    const TOP_PAD = 4

    const bar = (
      <button
        type="button"
        className={cn(
          "absolute flex cursor-pointer items-center overflow-hidden rounded-sm px-1.5",
          "transition-all hover:brightness-90 focus:ring-2 focus:ring-green focus:ring-offset-1 focus:outline-none",
          isCancelled && "opacity-60"
        )}
        style={{
          left: props.left,
          width: props.width,
          top: TOP_PAD + lane * LANE_HEIGHT,
          height: LANE_HEIGHT - 2,
          minWidth: 4,
          backgroundColor: isCancelled ? "#FEE2E2" : color.bg,
          borderLeft: `2px solid ${isCancelled ? "#F87171" : color.border}`,
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {showLabel ? (
          <span className="truncate text-xs font-medium" style={{ color: isCancelled ? "#991B1B" : color.text }}>
            {booking.guestName ?? booking.platform}
          </span>
        ) : null}
      </button>
    )

    return (
      <BookingBarWithHover booking={booking} propertyName={propertyName}>
        {bar}
      </BookingBarWithHover>
    )
  }

  const { gridColumn, gridRow, isStart, isEnd } = props

  const bar = (
    <button
      type="button"
      className={cn(
        "truncate rounded-sm border-l-[3px] px-1.5 py-0.5 text-left text-[10px] font-medium leading-5 shadow-sm transition-colors focus:outline-none",
        isCancelled && "line-through opacity-70"
      )}
      style={{
        gridColumn,
        gridRow,
        marginLeft: isStart ? "0" : "-4px",
        marginRight: isEnd ? "0" : "-4px",
        paddingLeft: isStart ? "6px" : "10px",
        paddingRight: isEnd ? "6px" : "10px",
        backgroundColor: isCancelled
          ? "#FEE2E2"
          : isHovered || isSelected
            ? color.border
            : color.bg,
        borderLeftColor: isCancelled ? "#F87171" : isStart ? color.border : "transparent",
        borderRadius:
          isStart && isEnd ? "4px" : isStart ? "4px 0 0 4px" : isEnd ? "0 4px 4px 0" : "0",
        color: isCancelled ? "#991B1B" : isHovered || isSelected ? color.border : color.text,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isStart ? (booking.guestName ?? "Guest") : "\u00A0"}
    </button>
  )

  return (
    <BookingBarWithHover booking={booking} propertyName={propertyName}>
      {bar}
    </BookingBarWithHover>
  )
}
