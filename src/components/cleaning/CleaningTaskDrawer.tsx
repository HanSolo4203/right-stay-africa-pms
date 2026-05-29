"use client"

import { differenceInDays, format, isPast, isToday } from "date-fns"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { CleaningTaskRowTask, CleaningStatus } from "@/components/cleaning/CleaningTaskRow"
import { formatCleaningPropertyLabel } from "@/lib/cleaning/format-property-label"
import {
  cleaningTypeBadgeClass,
  cleaningTypeEmoji,
  cleaningTypeLabel,
} from "@/lib/cleaning/type-styles"

type CleaningTaskDrawerProps = {
  task: CleaningTaskRowTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (id: string, status: CleaningStatus) => Promise<void> | void
  onOpenNote: () => void
}

export function CleaningTaskDrawer({
  task,
  open,
  onOpenChange,
  onUpdateStatus,
  onOpenNote,
}: CleaningTaskDrawerProps) {
  const selectedTask = task

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[420px]">
        {selectedTask ? (
          (() => {
            const scheduledDate = new Date(selectedTask.scheduledDate)
            const checkIn = selectedTask.booking
              ? new Date(selectedTask.booking.checkIn)
              : null
            const checkOut = selectedTask.booking
              ? new Date(selectedTask.booking.checkOut)
              : null
            const nightsIntoStay =
              checkIn && checkOut ? differenceInDays(scheduledDate, checkIn) : null
            const isOverdue =
              isPast(scheduledDate) && !isToday(scheduledDate) && selectedTask.status === "scheduled"

            return (
              <>
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${cleaningTypeBadgeClass(selectedTask.type)}`}
                    >
                      {cleaningTypeEmoji(selectedTask.type)} {cleaningTypeLabel(selectedTask.type)} clean
                    </span>
                    {isOverdue && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                  <SheetTitle className="text-xl font-semibold">
                    {formatCleaningPropertyLabel(
                      selectedTask.property.name,
                      selectedTask.property.unitNumber,
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Scheduled date */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                      Scheduled for
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {isToday(scheduledDate)
                        ? "Today"
                        : format(scheduledDate, "EEEE, d MMMM yyyy")}
                    </p>
                    {selectedTask.type === "midstay" && (
                      <p className="text-sm text-gray-500 mt-1">
                        Day {nightsIntoStay} of stay
                        {selectedTask.midstayOccurrence &&
                          ` · Mid-stay clean #${selectedTask.midstayOccurrence}`}
                      </p>
                    )}
                  </div>

                  {selectedTask.booking && checkIn && checkOut ? (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                        Booking details
                      </p>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        {[
                          {
                            label: "Guest",
                            value: selectedTask.booking.guestName ?? "—",
                          },
                          {
                            label: "Platform",
                            value: selectedTask.booking.platform ?? "—",
                          },
                          {
                            label: "Check-in",
                            value: format(checkIn, "EEE d MMM yyyy"),
                          },
                          {
                            label: "Check-out",
                            value: format(checkOut, "EEE d MMM yyyy"),
                          },
                          {
                            label: "Total nights",
                            value: String(selectedTask.booking.nights ?? "—"),
                          },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-sm font-medium text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2">
                      Manual entry — not linked to a booking.
                    </p>
                  )}

                  {/* Notes */}
                  {selectedTask.notes && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        {selectedTask.notes}
                      </p>
                    </div>
                  )}

                  {/* Completed timestamp */}
                  {selectedTask.status === "completed" && (selectedTask as any).completedAt && (
                    <p className="text-xs text-gray-400">
                      Completed{" "}
                      {format(new Date((selectedTask as any).completedAt), "EEE d MMM yyyy, HH:mm")}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-100 space-y-2">
                    {selectedTask.status === "scheduled" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void onUpdateStatus(selectedTask.id, "completed")
                            onOpenChange(false)
                          }}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm"
                        >
                          ✓ Mark as complete
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenNote()
                          }}
                          className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          Add note
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void onUpdateStatus(selectedTask.id, "skipped")
                            onOpenChange(false)
                          }}
                          className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
                        >
                          Skip this clean
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void onUpdateStatus(selectedTask.id, "scheduled")
                          onOpenChange(false)
                        }}
                        className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 text-sm"
                      >
                        Reopen task
                      </button>
                    )}
                  </div>
                </div>
              </>
            )
          })()
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

