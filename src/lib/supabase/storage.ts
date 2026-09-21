import { createClient } from './client'
import { SIGNED_URL_EXPIRY } from '../constants'

/**
 * Generates a temporary signed URL for a private file in a Supabase Storage bucket.
 */
export async function getSignedMediaUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds: number = SIGNED_URL_EXPIRY * 60
): Promise<string | null> {
  if (!storagePath) return null
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      console.error(`Error creating signed URL for ${bucket}/${storagePath}:`, error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error(`Failed to get signed URL for ${bucket}/${storagePath}:`, err)
    return null
  }
}

/**
 * Uploads a file to a private Supabase Storage bucket.
 */
export async function uploadPrivateFile(
  bucket: string,
  storagePath: string,
  file: File
): Promise<{ error: Error | null }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) return { error }
    return { error: null }
  } catch (err: any) {
    return { error: err }
  }
}

/**
 * Deletes a file from a private Supabase Storage bucket.
 */
export async function deletePrivateFile(
  bucket: string,
  storagePath: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove([storagePath])
    if (error) return { error }
    return { error: null }
  } catch (err: any) {
    return { error: err }
  }
}
