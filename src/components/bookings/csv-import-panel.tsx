"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react"
import { QuickLinkPropertyModal } from "@/components/bookings/quick-link-property-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UnmatchedUplistingProperty } from "@/lib/csv-import/unmatched-properties"
import { cn } from "@/lib/utils"

const MAX_BYTES = 10 * 1024 * 1024

export type ImportSummary = {
  total_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  error_records: number
  property_breakdown: Record<
    string,
    { property_name: string; new: number; updated: number; skipped: number }
  >
  errors: Array<{ row: number; error: string }>
  import_log_id: string
}

type CsvImportLogApi = {
  id: string
  filename: string
  total_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  error_records: number
  errors: unknown
  property_summary: unknown
  imported_by: string | null
  created_at: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function parsePropertySummary(value: unknown): Record<
  string,
  { property_name: string; new: number; updated: number; skipped: number }
> {
  if (!value || typeof value !== "object") return {}
  const out: Record<string, { property_name: string; new: number; updated: number; skipped: number }> =
    {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue
    const o = v as Record<string, unknown>
    out[k] = {
      property_name: typeof o.property_name === "string" ? o.property_name : "",
      new: typeof o.new === "number" ? o.new : 0,
      updated: typeof o.updated === "number" ? o.updated : 0,
      skipped: typeof o.skipped === "number" ? o.skipped : 0,
    }
  }
  return out
}

function parseErrorList(value: unknown): Array<{ row: number; error: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const o = item as Record<string, unknown>
    const row = typeof o.row === "number" ? o.row : 0
    const error = typeof o.error === "string" ? o.error : ""
    return [{ row, error }]
  })
}

type BookingCsvDropzoneProps = {
  onFile: (file: File) => void
  onClientError: (message: string) => void
}

function BookingCsvDropzone({ onFile, onClientError }: BookingCsvDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxSize: MAX_BYTES,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".csv"],
    },
    multiple: false,
    onDropAccepted(files) {
      const f = files[0]
      if (!f) return
      if (!f.name.toLowerCase().endsWith(".csv")) {
        onClientError("Please choose a file with a .csv extension.")
        return
      }
      onClientError("")
      onFile(f)
    },
    onDropRejected(fileRejections) {
      const first = fileRejections[0]
      const code = first?.errors[0]?.code
      if (code === "file-too-large") {
        onClientError("File must be 10MB or smaller.")
      } else {
        onClientError(first?.errors[0]?.message ?? "Could not accept that file.")
      }
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
        isDragActive ? "border-green-600 bg-green-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mb-3 size-10 text-slate-400" aria-hidden />
      <p className="text-center text-sm font-medium text-slate-800">
        {isDragActive ? "Drop the CSV file here" : "Drag and drop your booking CSV here"}
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">or click to browse — .csv only, max 10MB</p>
    </div>
  )
}

type CsvImportPanelProps = {
  canImport: boolean
}

export function CsvImportPanel({ canImport }: CsvImportPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dropzoneKey, setDropzoneKey] = useState(0)
  const [clientError, setClientError] = useState("")
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [resultsErrorsOpen, setResultsErrorsOpen] = useState(false)
  const [logs, setLogs] = useState<CsvImportLogApi[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [lastRequestErrors, setLastRequestErrors] = useState<Array<{ row: number; error: string }>>([])
  const [unmatchedProperties, setUnmatchedProperties] = useState<UnmatchedUplistingProperty[]>([])
  const [linkModalTarget, setLinkModalTarget] = useState<UnmatchedUplistingProperty | null>(null)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch("/api/bookings/import-logs", { credentials: "include" })
      if (!res.ok) return
      const data = (await res.json()) as { logs?: CsvImportLogApi[] }
      setLogs(data.logs ?? [])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const resetImportFlow = () => {
    setFile(null)
    setSummary(null)
    setServerError("")
    setClientError("")
    setLastRequestErrors([])
    setUnmatchedProperties([])
    setLinkModalTarget(null)
    setResultsErrorsOpen(false)
    setDropzoneKey((k) => k + 1)
  }

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".csv")) return "File must have a .csv extension."
    if (f.size === 0) return "File is empty."
    if (f.size > MAX_BYTES) return "File must be 10MB or smaller."
    const mime = f.type.trim().toLowerCase()
    if (mime && mime !== "text/csv" && mime !== "text/plain") {
      return "File must be text/csv or text/plain."
    }
    return null
  }

  const onImport = async () => {
    if (!file || !canImport) return
    const v = validateFile(file)
    if (v) {
      setServerError(v)
      return
    }
    setServerError("")
    setLastRequestErrors([])
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const res = await fetch("/api/bookings/import-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        errors?: Array<{ row: number; error: string }>
        summary?: ImportSummary
        unmatched_properties?: UnmatchedUplistingProperty[]
      }

      if (!res.ok || data.success === false) {
        const msg =
          data.error ??
          (res.status === 401 ? "You are not authorized to import." : "Import failed.")
        setServerError(msg)
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setLastRequestErrors(data.errors)
        }
        return
      }

      if (data.summary) {
        setSummary(data.summary)
        setResultsErrorsOpen((data.summary.errors?.length ?? 0) > 0)
      }
      setUnmatchedProperties(
        Array.isArray(data.unmatched_properties) ? data.unmatched_properties : []
      )
      void loadLogs()
    } catch {
      setServerError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const alertMessage = serverError || clientError

  return (
    <div className="space-y-8">
      {!canImport ? (
        <Alert>
          <AlertTitle>Upload restricted</AlertTitle>
          <AlertDescription>
            Only Super Admins and Property Managers can upload booking CSV files. You can still review
            import history below.
          </AlertDescription>
        </Alert>
      ) : null}

      {canImport && alertMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p>{alertMessage}</p>
            {lastRequestErrors.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-sm">
                {lastRequestErrors.map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Row {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {canImport ? (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="size-5 text-green-700" />
            Upload CSV
          </CardTitle>
          <CardDescription>
            Select your Uplisting booking export. Rows are matched to properties by Uplisting property
            ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BookingCsvDropzone
            key={dropzoneKey}
            onFile={(f) => {
              setFile(f)
              setServerError("")
            }}
            onClientError={(msg) => {
              setClientError(msg)
              if (msg) setFile(null)
            }}
          />

          {file ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <FileSpreadsheet className="size-4 text-green-700" />
              <span className="font-medium text-slate-900">{file.name}</span>
              <span className="text-slate-500">({formatBytes(file.size)})</span>
            </div>
          ) : null}

          <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Export from Uplisting</p>
            <p className="mt-1 text-amber-900/90">
              Export your booking report from Uplisting:{" "}
              <span className="font-medium">Reports → Booking Report → Request / Export CSV</span> (you
              will receive the file by email or download when ready).
            </p>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" />
              Processing {file?.name ?? "file"}… please wait
            </p>
          ) : null}

          <Button
            type="button"
            className="bg-green-700 text-white hover:bg-green-800"
            disabled={!file || loading}
            onClick={() => void onImport()}
          >
            Import bookings
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {canImport && summary ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Import results</CardTitle>
            <CardDescription>
              Import complete — {summary.new_records} new, {summary.updated_records} updated,{" "}
              {summary.skipped_records} skipped
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unmatchedProperties.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">Unmatched properties</p>
                    <p className="mt-1 text-sm text-amber-900/90">
                      {unmatchedProperties.length} propert
                      {unmatchedProperties.length === 1 ? "y" : "ies"} in this CSV{" "}
                      {unmatchedProperties.length === 1 ? "was" : "were"} not found in your database and{" "}
                      {unmatchedProperties.length === 1 ? "its" : "their"} bookings were skipped.
                    </p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uplisting ID</TableHead>
                      <TableHead>Property nickname (CSV)</TableHead>
                      <TableHead className="text-right">Rows skipped</TableHead>
                      <TableHead className="w-[140px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedProperties.map((row) => (
                      <TableRow key={row.uplisting_id}>
                        <TableCell className="font-mono text-xs">{row.uplisting_id}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.nickname || "—"}</TableCell>
                        <TableCell className="text-right">{row.row_count}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-900 hover:bg-amber-100"
                            onClick={() => setLinkModalTarget(row)}
                          >
                            Set up property
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <strong>Summary:</strong> {summary.new_records} new booking
              {summary.new_records === 1 ? "" : "s"} added, {summary.updated_records} updated,{" "}
              {summary.skipped_records} skipped (unchanged rows).
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Property breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property name</TableHead>
                    <TableHead>Uplisting ID</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Total rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(summary.property_breakdown).map(([uplistingId, row]) => {
                    const total = row.new + row.updated + row.skipped
                    return (
                      <TableRow key={uplistingId}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {row.property_name || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{uplistingId}</TableCell>
                        <TableCell className="text-right">{row.new}</TableCell>
                        <TableCell className="text-right">{row.updated}</TableCell>
                        <TableCell className="text-right">{row.skipped}</TableCell>
                        <TableCell className="text-right">{total}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {summary.errors.length > 0 ? (
              <div className="rounded-lg border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
                  onClick={() => setResultsErrorsOpen((o) => !o)}
                >
                  View errors ({summary.errors.length})
                  <ChevronDown
                    className={cn("size-4 transition-transform", resultsErrorsOpen && "rotate-180")}
                  />
                </button>
                {resultsErrorsOpen ? (
                  <ul className="border-t border-slate-200 px-4 py-3 text-sm text-red-800">
                    {summary.errors.map((err, i) => (
                      <li key={`${err.row}-${i}`}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <Button type="button" variant="outline" onClick={resetImportFlow}>
              Import another file
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Import history</CardTitle>
            <CardDescription>Last 20 CSV imports</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={logsLoading}
            onClick={() => void loadLogs()}
          >
            <RefreshCw className={cn("mr-2 size-4", logsLoading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading && logs.length === 0 ? (
            <p className="text-sm text-slate-500">Loading history…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Date</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="text-right">Total rows</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Imported by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const open = expandedLogId === log.id
                  const pb = parsePropertySummary(log.property_summary)
                  const errs = parseErrorList(log.errors)
                  return (
                    <Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedLogId(open ? null : log.id)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={cn("size-4 text-slate-500 transition-transform", open && "rotate-180")}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                        <TableCell className="max-w-[180px] truncate font-mono text-xs">
                          {log.filename}
                        </TableCell>
                        <TableCell className="text-right">{log.total_rows}</TableCell>
                        <TableCell className="text-right">{log.new_records}</TableCell>
                        <TableCell className="text-right">{log.updated_records}</TableCell>
                        <TableCell className="text-right">{log.skipped_records}</TableCell>
                        <TableCell className="text-right">{log.error_records}</TableCell>
                        <TableCell className="max-w-[120px] truncate font-mono text-xs">
                          {log.imported_by ?? "—"}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={9} className="whitespace-normal p-4 align-top">
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Property breakdown
                                </h5>
                                <Table className="mt-2">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Property</TableHead>
                                      <TableHead>Uplisting ID</TableHead>
                                      <TableHead className="text-right">New</TableHead>
                                      <TableHead className="text-right">Updated</TableHead>
                                      <TableHead className="text-right">Skipped</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.entries(pb).map(([id, row]) => (
                                      <TableRow key={id}>
                                        <TableCell>{row.property_name || "—"}</TableCell>
                                        <TableCell className="font-mono text-xs">{id}</TableCell>
                                        <TableCell className="text-right">{row.new}</TableCell>
                                        <TableCell className="text-right">{row.updated}</TableCell>
                                        <TableCell className="text-right">{row.skipped}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              {errs.length > 0 ? (
                                <div>
                                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Errors
                                  </h5>
                                  <ul className="mt-2 text-sm text-red-800">
                                    {errs.map((e, i) => (
                                      <li key={`${e.row}-${i}`}>
                                        Row {e.row}: {e.error}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuickLinkPropertyModal
        open={linkModalTarget !== null}
        onOpenChange={(open) => {
          if (!open) setLinkModalTarget(null)
        }}
        uplistingId={linkModalTarget?.uplisting_id ?? ""}
        nickname={linkModalTarget?.nickname ?? ""}
        onLinked={(id) => {
          setUnmatchedProperties((prev) => prev.filter((p) => p.uplisting_id !== id))
          void loadLogs()
        }}
      />
    </div>
  )
}
