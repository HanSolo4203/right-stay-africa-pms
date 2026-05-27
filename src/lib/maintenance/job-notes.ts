export type MaintenanceNoteEntry = {
  text: string
  createdAt: string
  type: "manual" | "system"
  expenseId?: string
}

export function parseMaintenanceNotes(raw: string | null | undefined): MaintenanceNoteEntry[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is MaintenanceNoteEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as MaintenanceNoteEntry).text === "string" &&
        typeof (e as MaintenanceNoteEntry).createdAt === "string" &&
        ((e as MaintenanceNoteEntry).type === "manual" ||
          (e as MaintenanceNoteEntry).type === "system")
    )
  } catch {
    return []
  }
}

export function serializeMaintenanceNotes(entries: MaintenanceNoteEntry[]): string {
  return JSON.stringify(entries)
}

export function appendMaintenanceNote(
  raw: string | null | undefined,
  entry: Omit<MaintenanceNoteEntry, "createdAt"> & { createdAt?: string }
): string {
  const entries = parseMaintenanceNotes(raw)
  entries.push({
    ...entry,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  })
  return serializeMaintenanceNotes(entries)
}

export function maintenanceExpenseRef(jobId: string): string {
  return `[ref:maintenance-job:${jobId}]`
}

export function hasMaintenanceExpenseRef(notes: string | null | undefined, jobId: string): boolean {
  return parseMaintenanceNotes(notes).some((e) => e.expenseId) ||
    parseMaintenanceNotes(notes).some((e) => e.text.includes(maintenanceExpenseRef(jobId)))
}
