"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AcceptMap = { [key: string]: string[] }

type UploadedFile = {
  id: string
  name: string
  size: number
  path: string
  signedUrl: string
  mimeType: string
  progress: number
  isUploading: boolean
  error?: string
}

type FileUploaderProps = {
  bucket: string
  storagePath: string
  accept: AcceptMap
  maxFiles: number
  maxSizeMB: number
  onUploadComplete: (urls: string[]) => void
  label: string
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[idx]}`
}

function acceptedTypesLabel(accept: AcceptMap): string {
  const tokens = Object.entries(accept).flatMap(([mime, exts]) => {
    const extTokens = exts.map((ext) => ext.toLowerCase())
    return extTokens.length > 0 ? extTokens : [mime]
  })
  return tokens.join(", ")
}

function sanitizeFilename(fileName: string): string {
  return fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase()
}

async function uploadWithProgress({
  file,
  bucket,
  objectPath,
  onProgress,
}: {
  file: File
  bucket: string
  objectPath: string
  onProgress: (value: number) => void
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/storage/upload")

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        onProgress(50)
        return
      }
      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress(Math.max(0, Math.min(100, progress)))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
        return
      }

      let message = "Upload failed."
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        message = parsed.message ?? parsed.error ?? message
      } catch {
        // keep fallback message
      }
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error("Upload failed. Network error."))
    xhr.onabort = () => reject(new Error("Upload aborted."))

    const formData = new FormData()
    formData.append("bucket", bucket)
    formData.append("path", objectPath)
    formData.append("file", file)
    xhr.send(formData)
  })
}

export function FileUploader({
  bucket,
  storagePath,
  accept,
  maxFiles,
  maxSizeMB,
  onUploadComplete,
  label,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dropError, setDropError] = useState<string | null>(null)

  const acceptedLabel = useMemo(() => acceptedTypesLabel(accept), [accept])
  const maxBytes = maxSizeMB * 1024 * 1024

  const updateItem = useCallback((id: string, patch: Partial<UploadedFile>) => {
    setFiles((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  useEffect(() => {
    const completedPaths = files
      .filter((item) => !item.isUploading && !item.error && item.path.length > 0)
      .map((item) => item.path)
    onUploadComplete(completedPaths)
  }, [files, onUploadComplete])

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setDropError(null)

      if (fileRejections.length > 0) {
        const firstError = fileRejections[0]?.errors[0]
        setDropError(firstError?.message ?? "Some files were rejected.")
      }

      if (acceptedFiles.length === 0) return

      const availableSlots = Math.max(0, maxFiles - files.length)
      if (availableSlots === 0) {
        setDropError(`Maximum of ${maxFiles} file(s) reached.`)
        return
      }

      const selected = acceptedFiles.slice(0, availableSlots)
      const createdAt = Date.now()
      const stagedItems: UploadedFile[] = selected.map((file, index) => {
        const id = `${createdAt}-${index}-${file.name}`
        return {
          id,
          name: file.name,
          size: file.size,
          path: "",
          signedUrl: "",
          mimeType: file.type,
          progress: 0,
          isUploading: true,
        }
      })

      setFiles((current) => [...current, ...stagedItems])

      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index]
        const staged = stagedItems[index]
        if (!staged) continue

        try {
          const ext = file.name.includes(".") ? file.name.split(".").pop() : ""
          const cleanFileName = sanitizeFilename(file.name.replace(/\.[^/.]+$/, ""))
          const finalName = ext ? `${cleanFileName}.${ext?.toLowerCase()}` : cleanFileName
          const objectPath = `${storagePath.replace(/\/$/, "")}/${Date.now()}-${finalName}`

          await uploadWithProgress({
            file,
            bucket,
            objectPath,
            onProgress: (progress) => updateItem(staged.id, { progress }),
          })

          const response = await fetch(
            `/api/storage/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(
              objectPath
            )}`
          )
          const payload = (await response.json()) as { signedUrl?: string; error?: string }
          if (!response.ok || !payload.signedUrl) {
            throw new Error(payload.error ?? "Uploaded, but failed to get file URL.")
          }

          setFiles((current) =>
            current.map((item) =>
              item.id === staged.id
                ? {
                    ...item,
                    path: objectPath,
                    signedUrl: payload.signedUrl ?? "",
                    isUploading: false,
                    progress: 100,
                  }
                : item
            )
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed."
          updateItem(staged.id, { isUploading: false, error: message, progress: 0 })
        }
      }
    },
    [bucket, files.length, maxFiles, storagePath, updateItem]
  )

  const removeFile = useCallback(
    async (id: string) => {
      const target = files.find((item) => item.id === id)
      if (!target) return

      setFiles((current) => {
        return current.filter((item) => item.id !== id)
      })

      if (target.path) {
        try {
          await supabase.storage.from(bucket).remove([target.path])
        } catch {
          // Ignore storage delete failures because local state is already updated.
        }
      }
    },
    [bucket, files]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize: maxBytes,
    multiple: maxFiles > 1,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click to browse or drag and drop. Accepted: {acceptedLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {maxFiles} file(s), up to {maxSizeMB}MB each.
        </p>
      </div>

      {dropError ? <p className="text-sm text-red-600">{dropError}</p> : null}

      <div className="space-y-2">
        {files.map((file) => {
          const isImage = file.mimeType.startsWith("image/")
          const isPdf = file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

          return (
            <div key={file.id} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                {isImage && file.signedUrl ? (
                  <img
                    src={file.signedUrl}
                    alt={file.name}
                    className="size-12 rounded-md object-cover ring-1 ring-border"
                  />
                ) : isPdf ? (
                  <div className="grid size-12 place-items-center rounded-md bg-muted ring-1 ring-border">
                    <FileText className="size-6 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid size-12 place-items-center rounded-md bg-muted ring-1 ring-border">
                    <UploadCloud className="size-6 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>

                  {file.isUploading ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  ) : null}

                  {file.error ? <p className="mt-2 text-xs text-red-600">{file.error}</p> : null}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void removeFile(file.id)}
                  disabled={file.isUploading}
                  aria-label={`Remove ${file.name}`}
                >
                  {file.isUploading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
