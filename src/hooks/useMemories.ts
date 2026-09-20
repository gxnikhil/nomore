'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { SavedMedia } from '@/lib/types'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'

export function useMemories(currentUserId: string | undefined) {
  const [memories, setMemories] = useState<SavedMedia[]>([])
  const [onThisDayMemories, setOnThisDayMemories] = useState<SavedMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all')

  // Fetch chronological memories timeline
  const fetchMemories = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('saved_media')
        .select('*, uploader:profiles(*)')
        .order('memory_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filterType !== 'all') {
        query = query.eq('media_type', filterType)
      }

      const { data: rawData, error: dbError } = await query
      if (dbError) throw dbError

      if (!rawData || rawData.length === 0) {
        setMemories([])
        setLoading(false)
        return
      }

      // Resolve signed URLs for memories
      const withUrls: SavedMedia[] = await Promise.all(
        rawData.map(async (item) => ({
          ...item,
          media_url: (await getSignedMediaUrl(BUCKETS.MEMORIES, item.storage_path)) || undefined,
        }))
      )

      setMemories(withUrls)
    } catch (err: any) {
      console.error('Error fetching memories:', err)
      toast.error('Failed to load memories timeline.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId, filterType])

  // Fetch "On This Day" memories from previous years
  const fetchOnThisDay = useCallback(async () => {
    if (!currentUserId) return

    try {
      const supabase = createClient()
      const today = new Date()
      const currentMonth = today.getMonth() + 1
      const currentDay = today.getDate()
      const currentYear = today.getFullYear()

      // Query saved_media matching current month and day from previous years
      const { data: rawData } = await supabase
        .from('saved_media')
        .select('*, uploader:profiles(*)')

      if (rawData && rawData.length > 0) {
        const matching = rawData.filter((item) => {
          if (!item.memory_date && !item.created_at) return false
          const date = new Date(item.memory_date || item.created_at)
          const m = date.getMonth() + 1
          const d = date.getDate()
          const y = date.getFullYear()
          return m === currentMonth && d === currentDay && y < currentYear
        })

        const withUrls: SavedMedia[] = await Promise.all(
          matching.map(async (item) => ({
            ...item,
            media_url: (await getSignedMediaUrl(BUCKETS.MEMORIES, item.storage_path)) || undefined,
          }))
        )

        setOnThisDayMemories(withUrls)
      } else {
        setOnThisDayMemories([])
      }
    } catch (err) {
      console.error('Error fetching On This Day memories:', err)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchMemories()
    fetchOnThisDay()
  }, [fetchMemories, fetchOnThisDay])

  // Upload a new memory file
  const uploadMemory = async (
    file: File,
    caption?: string,
    customDate?: string
  ): Promise<boolean> => {
    if (!currentUserId) return false

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file.')
      return false
    }

    try {
      setUploading(true)
      const supabase = createClient()

      // Get space ID
      const { data: spaceMember } = await supabase
        .from('private_space_members')
        .select('space_id')
        .eq('auth_user_id', currentUserId)
        .single()

      if (!spaceMember) throw new Error('Space membership not found.')

      const mediaType = getMediaType(file.type)
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${currentUserId}/${crypto.randomUUID()}.${ext}`

      // Upload file to private memories bucket
      const { error: storageError } = await uploadPrivateFile(BUCKETS.MEMORIES, storagePath, file)
      if (storageError) throw storageError

      // Insert record in saved_media
      const { error: dbError } = await supabase.from('saved_media').insert({
        space_id: spaceMember.space_id,
        storage_path: storagePath,
        media_type: mediaType,
        mime_type: file.type,
        caption: caption?.trim() || null,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: currentUserId,
        memory_date: customDate || new Date().toISOString().split('T')[0],
        is_favorite: false,
      })

      if (dbError) throw dbError

      // Trigger private notification for partner
      sendPrivateNotification({
        type: 'memory',
        title: 'New Memory Saved',
        body: `Saved a new ${mediaType} memory to timeline`,
        data: { route: '/memories' },
      })

      toast.success('Memory saved to timeline!')
      await fetchMemories()
      await fetchOnThisDay()
      return true
    } catch (err: any) {
      console.error('Error uploading memory:', err)
      toast.error(err?.message || 'Failed to save memory.')
      return false
    } finally {
      setUploading(false)
    }
  }

  // Toggle memory favorite status
  const toggleFavorite = async (memoryId: string, currentStatus: boolean) => {
    if (!currentUserId) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('saved_media')
        .update({ is_favorite: !currentStatus })
        .eq('id', memoryId)

      if (error) throw error

      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, is_favorite: !currentStatus } : m))
      )
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  // Delete own memory
  const deleteMemory = async (memoryId: string, storagePath: string) => {
    if (!currentUserId) return

    try {
      const supabase = createClient()

      // 1. Delete DB record
      const { error: dbError } = await supabase.from('saved_media').delete().eq('id', memoryId)
      if (dbError) throw dbError

      // 2. Delete Storage object
      await deletePrivateFile(BUCKETS.MEMORIES, storagePath)

      toast.success('Memory deleted.')
      setMemories((prev) => prev.filter((m) => m.id !== memoryId))
      setOnThisDayMemories((prev) => prev.filter((m) => m.id !== memoryId))
    } catch (err: any) {
      console.error('Error deleting memory:', err)
      toast.error('Failed to delete memory.')
    }
  }

  return {
    memories,
    onThisDayMemories,
    loading,
    uploading,
    filterType,
    setFilterType,
    fetchMemories,
    uploadMemory,
    toggleFavorite,
    deleteMemory,
  }
}
