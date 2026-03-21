export const RECEIPT_CATEGORY_VALUES = [
  "MAINTENANCE",
  "CLEANING",
  "SUPPLIES",
  "UTILITIES",
  "RATES_TAXES",
  "INSURANCE",
  "OTHER",
] as const

export type ReceiptCategoryValue = (typeof RECEIPT_CATEGORY_VALUES)[number]

export type ReceiptActionInput = {
  date: string
  supplier: string
  amount: number
  category: ReceiptCategoryValue
  notes?: string
  file_url?: string | null
  file_name?: string | null
}

export type ReceiptFormItem = {
  id: string
  date: string
  supplier: string
  amount: string
  category: ReceiptCategoryValue
  notes: string | null
  file_url: string | null
  file_name: string | null
}
