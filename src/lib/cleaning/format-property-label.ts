/** Property label for cleaning schedule UI (name + unit when set). */
export function formatCleaningPropertyLabel(
  name: string,
  unitNumber?: string | null,
): string {
  const unit = unitNumber?.trim()
  if (!unit) return name
  return `${name} · ${unit}`
}
