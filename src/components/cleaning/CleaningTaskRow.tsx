"use client"

import { differenceInDays, format } from "date-fns"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCleaningPropertyLabel } from "@/lib/cleaning/format-property-label"
import {
  cleaningTypeBadgeClass,
  cleaningTypeEmoji,
  cleaningTypeLabel,
} from "@/lib/cleaning/type-styles"
import type { CleaningStatus, CleaningType } from "@/lib/cleaning/serialize"

export type { CleaningStatus, CleaningType }

export type CleaningTaskRowTask = {
  id: string
  type: CleaningType
  status: CleaningStatus
  scheduledDate: string | Date
  midstayOccurrence: number | null
  propertyId: string
  property: {
    id: string
    name: string
    unitNumber: string | null
  }
  booking: {
    id: string
    guestName: string | null
    checkIn: string | Date
    checkOut: string | Date
    nights: number | null
    platform: string | null
  } | null
  notes?: string | null
}

type CleaningTaskRowProps = {
  task: CleaningTaskRowTask
  isOverdue: boolean
  onMarkDone: () => void
  onSkip: () => void
  onReopen: () => void
  onAddNote: () => void
  onClick: () => void
}

export function CleaningTaskRow({
  task,
  isOverdue,
  onMarkDone,
  onSkip,
  onReopen,
  onAddNote,
  onClick,
}: CleaningTaskRowProps) {
  const scheduledDate = new Date(task.scheduledDate)
  const checkIn = task.booking ? new Date(task.booking.checkIn) : null
  const checkOut = task.booking ? new Date(task.booking.checkOut) : null
  const nightsIntoStay =
    checkIn && checkOut ? differenceInDays(scheduledDate, checkIn) : null

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 p-4 bg-white rounded-xl border cursor-pointer transition-all hover:shadow-sm
        ${task.status === "completed" ? "opacity-55" : ""}
        ${isOverdue ? "border-red-200 bg-red-50/20" : "border-gray-200"}`}
    >
      {/* Type badge */}
      <div
        className={`flex-shrink-0 w-28 text-center py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide border ${cleaningTypeBadgeClass(task.type)}`}
      >
        {cleaningTypeEmoji(task.type)} {cleaningTypeLabel(task.type)}
      </div>

      {/* Property + guest */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-900 truncate">
            {formatCleaningPropertyLabel(task.property.name, task.property.unitNumber)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500 truncate">
            {task.booking?.guestName ?? (task.type === "manual" ? "Manual entry" : "Guest")}
          </span>
          {task.booking?.platform && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0
                ${
                  task.booking!.platform === "Airbnb"
                    ? "bg-red-50 text-red-600"
                    : task.booking!.platform === "Booking.com"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-green-50 text-green-700"
                }`}
            >
              {task.booking!.platform}
            </span>
          )}
        </div>
      </div>

      {/* Booking context */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <div className="text-xs font-medium text-gray-600">
          {!task.booking
            ? "No booking"
            : task.type === "checkout"
              ? `${task.booking.nights ?? "?"}nt stay`
              : nightsIntoStay != null
                ? `Night ${nightsIntoStay} of ${task.booking.nights ?? "?"}`
                : "—"}
        </div>
        {task.type === "midstay" && task.midstayOccurrence && (
          <div className="text-xs text-gray-400 mt-0.5">
            Clean #{task.midstayOccurrence}
          </div>
        )}
      </div>

      {/* Stay dates */}
      {checkIn && checkOut ? (
        <div className="text-right flex-shrink-0 hidden md:block">
          <div className="text-xs text-gray-400">
            {format(checkIn, "d MMM")}
            {" → "}
            {format(checkOut, "d MMM")}
          </div>
        </div>
      ) : null}

      {/* Status + actions */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {task.status === "completed" && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
            ✓ Done
          </span>
        )}
        {task.status === "skipped" && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">
            Skipped
          </span>
        )}
        {task.status === "scheduled" && (
          <>
            <button
              type="button"
              onClick={onMarkDone}
              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors whitespace-nowrap"
            >
              Mark done
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddNote}>Add note</DropdownMenuItem>
                <DropdownMenuItem onClick={onSkip} variant="destructive">
                  Skip this clean
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {task.status !== "scheduled" && (
          <button
            type="button"
            onClick={onReopen}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

