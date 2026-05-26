import "server-only"

/** e.g. "Amalfi Luxury Apartments - Unit 305" */
export function formatPropertyBuildingLine(
  buildingName: string | null | undefined,
  unitNumber: string | null | undefined
): string | null {
  const building = buildingName?.trim()
  const unitRaw = unitNumber?.trim()
  if (!building && !unitRaw) return null

  const unitLabel = unitRaw
    ? /^unit\s+/i.test(unitRaw)
      ? unitRaw
      : `Unit ${unitRaw}`
    : null

  if (building && unitLabel) return `${building} - ${unitLabel}`
  if (building) return building
  return unitLabel
}
