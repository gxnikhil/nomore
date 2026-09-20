'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { Story, Profile, StoryView, StoryReaction } from '@/lib/types'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'

export function useStories(userId: string | undefined) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Fetch all active (unexpired) stories
  const fetchStories = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const now = new Date().toISOString()

      // 1. Fetch unexpired stories
      const { data: rawStories, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles(*),
          views:story_views(*),
          reactions:story_reactions(*)
        `)
        .gt('expires_at', now)
        .order('created_at', { ascending: true })

      if (storiesError) throw storiesError

      if (!rawStories || rawStories.length === 0) {
        setStories([])
        setLoading(false)
        return
      }

      // 2. Resolve signed URLs for each story media file
      const storiesWithUrls: Story[] = await Promise.all(
        rawStories.map(async (story) => {
          const mediaUrl = await getSignedMediaUrl(BUCKETS.STORIES, story.storage_path)
          return {
            ...story,
            media_url: mediaUrl || undefined,
          }
        })
      )

      setStories(storiesWithUrls)
    } catch (err: any) {
      console.error('Error fetching stories:', err)
      setError(err?.message || 'Failed to load stories.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  // Real-time listener for stories table
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    const channel = supabase
      .channel('public:stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => {
          fetchStories()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchStories])

  // Upload a new story
  const uploadStory = async (file: File, caption?: string): Promise<boolean> => {
    if (!userId) return false

    // 1. Validate file type and size
    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid story file.')
      return false
    }

    try {
      setUploading(true)
      setUploadProgress(20)
      const supabase = createClient()

      // 2. Get space ID
      const { data: memberData, error: spaceError } = await supabase
        .from('private_space_members')
        .select('space_id')
        .eq('auth_user_id', userId)
        .single()

      if (spaceError || !memberData) {
        throw new Error('Could not find your private space.')
      }

      const spaceId = memberData.space_id
      const mediaType = getMediaType(file.type)
      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `${userId}/${crypto.randomUUID()}.${fileExt}`

      setUploadProgress(50)

      // 3. Upload file to private stories bucket
      const { error: storageError } = await uploadPrivateFile(BUCKETS.STORIES, storagePath, file)
      if (storageError) throw storageError

      setUploadProgress(80)

      // 4. Insert story database record
      const { error: dbError } = await supabase.from('stories').insert({
        user_id: userId,
        space_id: spaceId,
        media_type: mediaType,
        storage_path: storagePath,
        caption: caption?.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      if (dbError) throw dbError

      // Fetch partner user ID to trigger private notification
      const { data: partnerMember } = await supabase
        .from('private_space_members')
        .select('auth_user_id')
        .eq('space_id', spaceId)
        .neq('auth_user_id', userId)
        .single()

      if (partnerMember?.auth_user_id) {
        sendPrivateNotification({
          recipientId: partnerMember.auth_user_id,
          senderId: userId,
          type: 'story',
          title: 'New Ephemeral Story',
          body: 'Posted a new 24h story',
          data: { route: '/stories' },
        })
      }

      setUploadProgress(100)
      toast.success('Story posted!')
      await fetchStories()
      return true
    } catch (err: any) {
      console.error('Error uploading story:', err)
      toast.error(err?.message || 'Failed to upload story.')
      return false
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Mark story as viewed
  const markAsViewed = async (storyId: string) => {
    if (!userId) return

    // Check if already viewed locally
    const targetStory = stories.find((s) => s.id === storyId)
    if (targetStory?.views?.some((v) => v.viewer_id === userId)) return

    try {
      const supabase = createClient()
      const { error: viewError } = await supabase
        .from('story_views')
        .insert({ story_id: storyId, viewer_id: userId })
        .single()

      if (viewError && !viewError.message.includes('unique')) {
        console.error('View record error:', viewError)
      }

      // Optimistic update
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const newView: StoryView = {
              id: crypto.randomUUID(),
              story_id: storyId,
              viewer_id: userId,
              viewed_at: new Date().toISOString(),
            }
            return {
              ...s,
              views: [...(s.views || []), newView],
            }
          }
          return s
        })
      )
    } catch (err) {
      console.error('Error recording story view:', err)
    }
  }

  // React to story with emoji
  const reactToStory = async (storyId: string, emoji: string) => {
    if (!userId) return

    try {
      const supabase = createClient()
      const { error: reactError } = await supabase
        .from('story_reactions')
        .upsert({ story_id: storyId, user_id: userId, emoji })

      if (reactError) throw reactError

      toast.success(`Reacted ${emoji}`)

      // Optimistic update
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const existing = (s.reactions || []).filter((r) => r.user_id !== userId)
            const newReaction: StoryReaction = {
              id: crypto.randomUUID(),
              story_id: storyId,
              user_id: userId,
              emoji,
              created_at: new Date().toISOString(),
            }
            return {
              ...s,
              reactions: [...existing, newReaction],
            }
          }
          return s
        })
      )
    } catch (err: any) {
      console.error('Error reacting to story:', err)
      toast.error('Failed to react.')
    }
  }

  // Delete story
  const deleteStory = async (storyId: string, storagePath: string) => {
    if (!userId) return

    try {
      const supabase = createClient()

      // 1. Delete DB record
      const { error: dbError } = await supabase.from('stories').delete().eq('id', storyId)
      if (dbError) throw dbError

      // 2. Delete Storage object
      await deletePrivateFile(BUCKETS.STORIES, storagePath)

      toast.success('Story deleted.')
      setStories((prev) => prev.filter((s) => s.id !== storyId))
    } catch (err: any) {
      console.error('Error deleting story:', err)
      toast.error('Failed to delete story.')
    }
  }

  return {
    stories,
    loading,
    error,
    uploading,
    uploadProgress,
    fetchStories,
    uploadStory,
    markAsViewed,
    reactToStory,
    deleteStory,
  }
}
