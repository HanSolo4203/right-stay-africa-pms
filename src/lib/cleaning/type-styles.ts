import type { CleaningType } from "@/lib/cleaning/serialize"

export function cleaningTypeLabel(type: CleaningType): string {
  switch (type) {
    case "checkout":
      return "Checkout"
    case "midstay":
      return "Mid-stay"
    case "manual":
      return "Manual"
    default:
      return type
  }
}

export function cleaningTypeBadgeClass(type: CleaningType): string {
  switch (type) {
    case "checkout":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "midstay":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "manual":
      return "bg-violet-100 text-violet-700 border-violet-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export function cleaningTypeEmoji(type: CleaningType): string {
  switch (type) {
    case "checkout":
      return "🧹"
    case "midstay":
      return "🔄"
    case "manual":
      return "✏️"
    default:
      return "🧹"
  }
}
