'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl } from '@/lib/supabase/storage'
import { Profile, SavedMedia, SharedAlbum, Message } from '@/lib/types'
import { BUCKETS } from '@/lib/constants'

export interface DashboardData {
  myProfile: Profile | null
  partnerProfile: Profile | null
  recentMemories: SavedMedia[]
  recentAlbums: SharedAlbum[]
  latestMessage: Message | null
  partnerBirthdayCountdown: { days: number; dateStr: string } | null
}

export function useDashboard(userId: string | undefined) {
  const [data, setData] = useState<DashboardData>({
    myProfile: null,
    partnerProfile: null,
    recentMemories: [],
    recentAlbums: [],
    latestMessage: null,
    partnerBirthdayCountdown: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // 1. Fetch profiles
      const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*')
      if (profileErr) throw profileErr

      const myProf = profiles?.find((p) => p.id === userId) || null
      const partnerProf = profiles?.find((p) => p.id !== userId) || null

      // Compute Birthday Countdown
      let bdayCountdown = null
      if (partnerProf?.birthday) {
        const bday = new Date(partnerProf.birthday)
        const now = new Date()
        let nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        if (nextBday < now) {
          nextBday.setFullYear(now.getFullYear() + 1)
        }
        const diffMs = nextBday.getTime() - now.getTime()
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        bdayCountdown = {
          days,
          dateStr: bday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }
      }

      // 2. Fetch recent memories
      const { data: rawMemories } = await supabase
        .from('saved_media')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      const memoriesWithUrls: SavedMedia[] = rawMemories
        ? await Promise.all(
            rawMemories.map(async (item) => ({
              ...item,
              media_url: (await getSignedMediaUrl(BUCKETS.MEMORIES, item.storage_path)) || undefined,
            }))
          )
        : []

      // 3. Fetch recent albums
      const { data: rawAlbums } = await supabase
        .from('shared_albums')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(4)

      const albumsWithUrls: SharedAlbum[] = rawAlbums
        ? await Promise.all(
            rawAlbums.map(async (album) => ({
              ...album,
              cover_url: album.cover_storage_path
                ? (await getSignedMediaUrl(BUCKETS.ALBUMS, album.cover_storage_path)) || undefined
                : undefined,
            }))
          )
        : []

      // 4. Fetch latest message snippet (if conversation exists)
      let lastMsg: Message | null = null
      const { data: convMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId)

      if (convMembers && convMembers.length > 0) {
        const convIds = convMembers.map((cm) => cm.conversation_id)
        const { data: msgData } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (msgData) {
          lastMsg = msgData as Message
        }
      }

      setData({
        myProfile: myProf,
        partnerProfile: partnerProf,
        recentMemories: memoriesWithUrls,
        recentAlbums: albumsWithUrls,
        latestMessage: lastMsg,
        partnerBirthdayCountdown: bdayCountdown,
      })
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError(err?.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return { data, loading, error, refresh: fetchDashboardData }
}
