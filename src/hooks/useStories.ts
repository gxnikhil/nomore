'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { Story, StoryView, StoryReaction, Profile } from '@/lib/types'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'

export interface StoryReply {
  id: string
  story_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export function useStories(userId: string | undefined) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Fetch unexpired stories (author or friends)
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

      // 2. Fetch author profiles separately
      const authorIds = Array.from(new Set(rawStories.map((s) => s.user_id)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', authorIds)

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]))

      // 3. Resolve signed URLs for each story media file
      const storiesWithUrls: Story[] = await Promise.all(
        rawStories.map(async (story) => {
          const mediaUrl = await getSignedMediaUrl(BUCKETS.STORIES, story.storage_path)
          return {
            ...story,
            profile: profileMap.get(story.user_id) || undefined,
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

  // Real-time listener for stories
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    const channel = supabase
      .channel('public:stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => fetchStories()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchStories])

  // Upload a new story
  const uploadStory = async (file: File, caption?: string): Promise<boolean> => {
    if (!userId) return false

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid story file.')
      return false
    }

    try {
      setUploading(true)
      setUploadProgress(20)
      const supabase = createClient()

      const mediaType = getMediaType(file.type)
      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `${userId}/${crypto.randomUUID()}.${fileExt}`

      setUploadProgress(50)

      const { error: storageError } = await uploadPrivateFile(BUCKETS.STORIES, storagePath, file)
      if (storageError) throw storageError

      setUploadProgress(80)

      const { error: dbError } = await supabase.from('stories').insert({
        user_id: userId,
        media_type: mediaType,
        storage_path: storagePath,
        caption: caption?.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      if (dbError) throw dbError

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

  // Send story reply
  const sendStoryReply = async (storyId: string, content: string): Promise<boolean> => {
    if (!userId || !content.trim()) return false

    try {
      const supabase = createClient()
      const targetStory = stories.find((s) => s.id === storyId)
      if (!targetStory) return false

      const { error } = await supabase.from('story_replies').insert({
        story_id: storyId,
        sender_id: userId,
        content: content.trim(),
      })

      if (error) throw error

      // Send private notification to story owner
      if (targetStory.user_id !== userId) {
        sendPrivateNotification({
          recipientId: targetStory.user_id,
          senderId: userId,
          type: 'story_reply',
          title: 'New Story Reply',
          body: content.trim().slice(0, 60),
          data: { route: '/stories' },
        })
      }

      toast.success('Reply sent!')
      return true
    } catch (err: any) {
      console.error('Error sending story reply:', err)
      toast.error('Failed to send reply.')
      return false
    }
  }

  // Fetch replies for a story (author only)
  const fetchStoryReplies = async (storyId: string): Promise<StoryReply[]> => {
    try {
      const supabase = createClient()
      const { data: rawReplies, error } = await supabase
        .from('story_replies')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!rawReplies) return []

      const senderIds = Array.from(new Set(rawReplies.map((r) => r.sender_id)))
      let senderMap = new Map()

      if (senderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', senderIds)

        senderMap = new Map((senderProfiles || []).map((p) => [p.id, p]))
      }

      return rawReplies.map((r) => ({
        ...r,
        sender: senderMap.get(r.sender_id),
      }))
    } catch (err) {
      console.error('Error fetching story replies:', err)
      return []
    }
  }

  // Mark story as viewed
  const markAsViewed = async (storyId: string) => {
    if (!userId) return

    const targetStory = stories.find((s) => s.id === storyId)
    if (targetStory?.views?.some((v) => v.viewer_id === userId)) return

    try {
      const supabase = createClient()
      await supabase
        .from('story_views')
        .insert({ story_id: storyId, viewer_id: userId })
        .single()

      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId) {
            const newView: StoryView = {
              id: crypto.randomUUID(),
              story_id: storyId,
              viewer_id: userId,
              viewed_at: new Date().toISOString(),
            }
            return { ...s, views: [...(s.views || []), newView] }
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
      const { error: rpcErr } = await supabase.rpc('react_to_story_and_notify_chat', {
        p_story_id: storyId,
        p_emoji: emoji,
      })

      if (rpcErr) throw rpcErr

      toast.success(`Reacted ${emoji}`)
      await fetchStories()
    } catch (err: any) {
      console.error('Error reacting to story:', err)
      toast.error(err?.message || 'Failed to react.')
    }
  }

  // Fetch viewers for a story (author only)
  const fetchStoryViewers = async (storyId: string): Promise<Profile[]> => {
    try {
      const supabase = createClient()
      const { data: rawViews, error } = await supabase
        .from('story_views')
        .select('viewer_id')
        .eq('story_id', storyId)

      if (error) throw error
      if (!rawViews || rawViews.length === 0) return []

      const viewerIds = Array.from(new Set(rawViews.map((v) => v.viewer_id)))
      const { data: viewerProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', viewerIds)

      return (viewerProfiles as Profile[]) || []
    } catch (err) {
      console.error('Error fetching story viewers:', err)
      return []
    }
  }

  // Delete story
  const deleteStory = async (storyId: string, storagePath: string) => {
    if (!userId) return

    try {
      const supabase = createClient()
      const { error: dbError } = await supabase.from('stories').delete().eq('id', storyId)
      if (dbError) throw dbError

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
    sendStoryReply,
    fetchStoryReplies,
    fetchStoryViewers,
    markAsViewed,
    reactToStory,
    deleteStory,
  }
}
