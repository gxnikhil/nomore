'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Message } from '@/lib/types'

export interface DashboardData {
  myProfile: Profile | null
  partnerProfile: Profile | null
  latestMessage: Message | null
}

export function useDashboard(userId: string | undefined) {
  const [data, setData] = useState<DashboardData>({
    myProfile: null,
    partnerProfile: null,
    latestMessage: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const activeUserId = (!userId || userId === 'me') ? user?.id : userId

      if (!activeUserId) {
        setLoading(false)
        return
      }

      // 1. Fetch current user profile
      const { data: myProf } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('id', activeUserId)
        .single()

      // 2. Fetch latest message snippet (if any conversation exists)
      let lastMsg: Message | null = null
      const { data: convMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', activeUserId)

      if (convMembers && convMembers.length > 0) {
        const convIds = convMembers.map((cm) => cm.conversation_id)
        const { data: msgData } = await supabase
          .from('messages')
          .select('*, sender:profiles(id, username, display_name, avatar_url, bio)')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (msgData) {
          lastMsg = msgData as Message
        }
      }

      setData({
        myProfile: myProf || null,
        partnerProfile: null,
        latestMessage: lastMsg,
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
