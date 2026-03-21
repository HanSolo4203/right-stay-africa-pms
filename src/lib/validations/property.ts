import { PropertyStatus, PropertyType } from "@prisma/client"
import { z } from "zod"

function listingUrlField(hostCheck: (host: string) => boolean, hint: string) {
  return z
    .string()
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val === "") return
      let parsed: URL
      try {
        parsed = new URL(val)
      } catch {
        ctx.addIssue({ code: "custom", message: "Enter a valid URL." })
        return
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "URL must start with http or https." })
        return
      }
      if (!hostCheck(parsed.hostname.toLowerCase())) {
        ctx.addIssue({ code: "custom", message: hint })
      }
    })
}

export const propertySchema = z.object({
  name: z.string().min(1, "Property name is required."),
  address: z.string().min(1, "Address is required."),
  suburb: z.string().optional(),
  city: z.string().min(1, "City is required."),
  unit_number: z.string().optional(),
  building_name: z.string().optional(),
  type: z.enum(PropertyType),
  bedrooms: z.number().min(1, "Bedrooms must be at least 1."),
  bathrooms: z.number().min(1, "Bathrooms must be at least 1."),
  parking_bays: z.array(z.string()),
  status: z.enum(PropertyStatus),
  airbnb_listing_url: listingUrlField(
    (h) =>
      h === "airbnb.com" ||
      h.endsWith(".airbnb.com") ||
      /\.airbnb\./.test(h) ||
      h === "abnb.me" ||
      h.endsWith(".abnb.me"),
    "Use an Airbnb listing or abnb.me link."
  ),
  booking_com_listing_url: listingUrlField(
    (h) => h === "booking.com" || h.endsWith(".booking.com") || /\.booking\./.test(h),
    "Use a Booking.com property link."
  ),
  right_stay_commission_percent: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === "number" && Number.isNaN(val)) return undefined
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) ? n : undefined
    },
    z.number().min(0, "Min 0%").max(100, "Max 100%").optional()
  ),
})

export type PropertyFormValues = z.infer<typeof propertySchema>
