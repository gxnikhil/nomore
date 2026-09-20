import { createClient } from './client'
import { SIGNED_URL_EXPIRY, BUCKETS } from '../constants'

/**
 * Generates a temporary signed URL for a private file in a Supabase Storage bucket.
 */
export async function getSignedMediaUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds: number = SIGNED_URL_EXPIRY * 60 // default 1 hour
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

/**
 * Copies a private chat media file to the Memories bucket and registers it in `saved_media`.
 */
export async function copyChatMediaToMemories(
  sourceStoragePath: string,
  mediaType: 'image' | 'video',
  mimeType: string | null,
  fileName: string | null,
  fileSize: number | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 1. Get space ID
    const { data: memberData } = await supabase
      .from('private_space_members')
      .select('space_id')
      .eq('auth_user_id', userId)
      .single()

    if (!memberData) throw new Error('Private space membership not found.')

    // 2. Download blob from messages bucket
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKETS.MESSAGES)
      .download(sourceStoragePath)

    if (downloadError || !blob) {
      throw new Error(downloadError?.message || 'Failed to download chat media object.')
    }

    // 3. Upload blob to memories bucket
    const ext = fileName?.split('.').pop() || (mediaType === 'image' ? 'jpg' : 'mp4')
    const targetStoragePath = `${userId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKETS.MEMORIES)
      .upload(targetStoragePath, blob, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // 4. Insert row into saved_media table
    const { error: dbError } = await supabase.from('saved_media').insert({
      space_id: memberData.space_id,
      storage_path: targetStoragePath,
      media_type: mediaType,
      mime_type: mimeType || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
      file_name: fileName || `Chat Memory ${new Date().toLocaleDateString()}`,
      file_size: fileSize || blob.size,
      uploaded_by: userId,
      memory_date: new Date().toISOString().split('T')[0],
      is_favorite: false,
    })

    if (dbError) throw dbError

    return { success: true }
  } catch (err: any) {
    console.error('Error saving chat media to memories:', err)
    return { success: false, error: err?.message || 'Failed to save media to memories.' }
  }
}
