import type { MaintenanceJobCategory } from "@/lib/validations/maintenance"

export const CATEGORY_LABELS: Record<MaintenanceJobCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance repair",
  cleaning: "Cleaning",
  painting: "Painting",
  carpentry: "Carpentry",
  security: "Security",
  internet: "Internet/TV",
  hvac: "HVAC/Air con",
  pest_control: "Pest control",
  garden: "Garden",
  pool: "Pool",
  general: "General",
}

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const PRIORITY_BORDER: Record<string, string> = {
  urgent: "border-l-[#ef4444]",
  high: "border-l-[#f97316]",
  medium: "border-l-[#f59e0b]",
  low: "border-l-[#94a3b8]",
}

export const CONTRACTOR_TRADES = [
  "Plumber",
  "Electrician",
  "Cleaner",
  "Painter",
  "Carpenter",
  "Handyman",
  "HVAC",
  "Pest Control",
  "IT/Internet",
  "Security",
  "Garden/Landscaping",
  "Pool",
  "General",
] as const
