'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { SharedAlbum, AlbumMedia } from '@/lib/types'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'

export function useAlbums(currentUserId: string | undefined) {
  const [albums, setAlbums] = useState<SharedAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Fetch list of shared albums
  const fetchAlbums = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data: rawAlbums, error: dbErr } = await supabase
        .from('shared_albums')
        .select('*, creator:profiles(*)')
        .order('updated_at', { ascending: false })

      if (dbErr) throw dbErr

      if (!rawAlbums || rawAlbums.length === 0) {
        setAlbums([])
        setLoading(false)
        return
      }

      // Resolve cover URLs and count items
      const withDetails: SharedAlbum[] = await Promise.all(
        rawAlbums.map(async (album) => {
          const coverUrl = album.cover_storage_path
            ? await getSignedMediaUrl(BUCKETS.ALBUMS, album.cover_storage_path)
            : null

          const { count } = await supabase
            .from('album_media')
            .select('id', { count: 'exact', head: true })
            .eq('album_id', album.id)

          return {
            ...album,
            cover_url: coverUrl || undefined,
            media_count: count || 0,
          }
        })
      )

      setAlbums(withDetails)
    } catch (err: any) {
      console.error('Error fetching albums:', err)
      toast.error('Failed to load shared albums.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchAlbums()
  }, [fetchAlbums])

  // Create a new shared album
  const createAlbum = async (
    title: string,
    description?: string,
    coverFile?: File
  ): Promise<boolean> => {
    if (!currentUserId || !title.trim()) return false

    try {
      setCreating(true)
      const supabase = createClient()

      // Get space ID
      const { data: spaceMember } = await supabase
        .from('private_space_members')
        .select('space_id')
        .eq('auth_user_id', currentUserId)
        .single()

      if (!spaceMember) throw new Error('Private space membership not found.')

      let coverPath: string | null = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop() || 'jpg'
        coverPath = `covers/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await uploadPrivateFile(BUCKETS.ALBUMS, coverPath, coverFile)
        if (uploadErr) throw uploadErr
      }

      const { error: dbErr } = await supabase.from('shared_albums').insert({
        space_id: spaceMember.space_id,
        title: title.trim(),
        description: description?.trim() || null,
        cover_storage_path: coverPath,
        created_by: currentUserId,
      })

      if (dbErr) throw dbErr

      // Trigger private notification for partner
      sendPrivateNotification({
        type: 'album',
        title: 'New Shared Album',
        body: `Created album "${title.trim()}"`,
        data: { route: '/albums' },
      })

      toast.success('Shared album created!')
      await fetchAlbums()
      return true
    } catch (err: any) {
      console.error('Error creating album:', err)
      toast.error(err?.message || 'Failed to create album.')
      return false
    } finally {
      setCreating(false)
    }
  }

  // Fetch album media items
  const fetchAlbumMedia = async (albumId: string): Promise<AlbumMedia[]> => {
    try {
      const supabase = createClient()
      const { data: rawMedia, error: dbErr } = await supabase
        .from('album_media')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at', { ascending: false })

      if (dbErr) throw dbErr
      if (!rawMedia) return []

      return await Promise.all(
        rawMedia.map(async (item) => ({
          ...item,
          media_url: (await getSignedMediaUrl(BUCKETS.ALBUMS, item.storage_path)) || undefined,
        }))
      )
    } catch (err) {
      console.error('Error fetching album media:', err)
      return []
    }
  }

  // Upload photo/video to an album
  const addMediaToAlbum = async (
    albumId: string,
    file: File,
    caption?: string
  ): Promise<boolean> => {
    if (!currentUserId) return false

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file.')
      return false
    }

    try {
      const supabase = createClient()
      const mediaType = getMediaType(file.type)
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${albumId}/${crypto.randomUUID()}.${ext}`

      // Upload file to private albums bucket
      const { error: uploadErr } = await uploadPrivateFile(BUCKETS.ALBUMS, storagePath, file)
      if (uploadErr) throw uploadErr

      // Insert record in album_media
      const { error: dbErr } = await supabase.from('album_media').insert({
        album_id: albumId,
        storage_path: storagePath,
        media_type: mediaType,
        mime_type: file.type,
        caption: caption?.trim() || null,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: currentUserId,
      })

      if (dbErr) throw dbErr

      // Trigger private notification for partner
      sendPrivateNotification({
        type: 'album',
        title: 'New Album Media',
        body: `Added a new ${mediaType} to album`,
        data: { route: '/albums' },
      })

      // Update album updated_at timestamp
      await supabase
        .from('shared_albums')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', albumId)

      toast.success('Added to album!')
      await fetchAlbums()
      return true
    } catch (err: any) {
      console.error('Error adding media to album:', err)
      toast.error(err?.message || 'Failed to add media to album.')
      return false
    }
  }

  // Delete media item from album
  const deleteAlbumMedia = async (mediaId: string, storagePath: string, albumId: string) => {
    if (!currentUserId) return

    try {
      const supabase = createClient()

      // Delete DB record
      const { error: dbErr } = await supabase.from('album_media').delete().eq('id', mediaId)
      if (dbErr) throw dbErr

      // Delete Storage object
      await deletePrivateFile(BUCKETS.ALBUMS, storagePath)

      toast.success('Media removed from album.')
      await fetchAlbums()
    } catch (err) {
      console.error('Error deleting album media:', err)
      toast.error('Failed to remove media.')
    }
  }

  // Delete shared album
  const deleteAlbum = async (albumId: string) => {
    if (!currentUserId) return

    try {
      const supabase = createClient()

      // 1. Fetch all storage paths for this album
      const { data: mediaItems } = await supabase
        .from('album_media')
        .select('storage_path')
        .eq('album_id', albumId)

      // 2. Delete all Storage objects
      if (mediaItems && mediaItems.length > 0) {
        for (const item of mediaItems) {
          await deletePrivateFile(BUCKETS.ALBUMS, item.storage_path)
        }
      }

      // 3. Delete Album DB record
      const { error: dbErr } = await supabase.from('shared_albums').delete().eq('id', albumId)
      if (dbErr) throw dbErr

      toast.success('Album deleted.')
      await fetchAlbums()
    } catch (err: any) {
      console.error('Error deleting album:', err)
      toast.error('Failed to delete album.')
    }
  }

  return {
    albums,
    loading,
    creating,
    fetchAlbums,
    createAlbum,
    fetchAlbumMedia,
    addMediaToAlbum,
    deleteAlbumMedia,
    deleteAlbum,
  }
}
