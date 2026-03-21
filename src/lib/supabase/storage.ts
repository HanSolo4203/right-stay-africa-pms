import { supabaseAdmin } from "./admin"

// Storage helpers (server-only): uses the service role key from `supabaseAdmin`.

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) throw error

  return data?.path ?? path
}

export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60) // 1 hour

  if (error) throw error
  if (!data?.signedUrl) throw new Error("Failed to create signed URL")

  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

  if (error) throw error
}

