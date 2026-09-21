'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { sendPrivateNotification } from '@/lib/notifications'
import { toast } from 'sonner'

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export function useFriends(currentUserId: string | undefined) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch accepted friends & pending requests
  const fetchFriendData = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      // 1. Fetch friendships
      const { data: rawFriendships, error: fErr } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id1.eq.${currentUserId},user_id2.eq.${currentUserId}`)

      if (fErr) throw fErr

      const friendIds = (rawFriendships || []).map((f) =>
        f.user_id1 === currentUserId ? f.user_id2 : f.user_id1
      )

      if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds)

        setFriends((friendProfiles as Profile[]) || [])
      } else {
        setFriends([])
      }

      // 2. Fetch friend requests
      const { data: rawRequests, error: rErr } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)

      if (rErr) throw rErr

      const pending = (rawRequests || []).filter((r) => r.status === 'pending')
      const otherUserIds = Array.from(
        new Set(
          pending.map((r) => (r.sender_id === currentUserId ? r.receiver_id : r.sender_id))
        )
      )

      let profileMap = new Map<string, Profile>()
      if (otherUserIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', otherUserIds)

        profileMap = new Map(((userProfiles as Profile[]) || []).map((p) => [p.id, p]))
      }

      const incoming: FriendRequest[] = []
      const outgoing: FriendRequest[] = []

      pending.forEach((r) => {
        if (r.receiver_id === currentUserId) {
          incoming.push({ ...r, sender: profileMap.get(r.sender_id) })
        } else {
          outgoing.push({ ...r, receiver: profileMap.get(r.receiver_id) })
        }
      })

      setIncomingRequests(incoming)
      setOutgoingRequests(outgoing)
    } catch (err: any) {
      console.error('Error fetching friend data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchFriendData()
  }, [fetchFriendData])

  // Realtime updates for friend requests & friendships
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`friends_realtime:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => fetchFriendData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriendData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchFriendData])

  // Search public profiles by username or display name
  const searchUsers = async (query: string): Promise<Profile[]> => {
    if (!query.trim() || !currentUserId) return []
    const cleaned = query.trim().replace(/^@/, '').toLowerCase()

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .or(`username.ilike.%${cleaned}%,display_name.ilike.%${cleaned}%`)
        .limit(20)

      if (error) throw error
      return (data as Profile[]) || []
    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }

  // Send friend request
  const sendFriendRequest = async (receiverId: string): Promise<boolean> => {
    if (!currentUserId || receiverId === currentUserId) return false

    try {
      const supabase = createClient()

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
        status: 'pending',
      })

      if (error) {
        if (error.message.includes('unique')) {
          toast.error('Friend request already pending.')
          return false
        }
        throw error
      }

      sendPrivateNotification({
        recipientId: receiverId,
        senderId: currentUserId,
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'Sent you a friend request on NOMORE',
        data: { route: '/friends' },
      })

      toast.success('Friend request sent!')
      await fetchFriendData()
      return true
    } catch (err: any) {
      console.error('Error sending friend request:', err)
      toast.error(err?.message || 'Failed to send request.')
      return false
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (requestId: string, senderId: string): Promise<boolean> => {
    if (!currentUserId) return false

    try {
      const supabase = createClient()

      const { error: rpcErr } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
      })

      if (rpcErr) throw rpcErr

      sendPrivateNotification({
        recipientId: senderId,
        senderId: currentUserId,
        type: 'friend_accept',
        title: 'Friend Request Accepted',
        body: 'Accepted your friend request! You can now chat and view stories.',
        data: { route: '/chat' },
      })

      toast.success('Friend request accepted!')
      await fetchFriendData()
      return true
    } catch (err: any) {
      console.error('Error accepting friend request:', err)
      toast.error(err?.message || 'Failed to accept request.')
      return false
    }
  }

  // Reject friend request
  const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
    if (!currentUserId) return false

    try {
      const supabase = createClient()
      const { error: rpcErr } = await supabase.rpc('reject_friend_request', {
        request_id: requestId,
      })

      if (rpcErr) throw rpcErr

      toast.info('Friend request declined.')
      await fetchFriendData()
      return true
    } catch (err: any) {
      console.error('Error rejecting request:', err)
      toast.error(err?.message || 'Failed to decline request.')
      return false
    }
  }

  // Unfriend
  const unfriend = async (friendId: string): Promise<boolean> => {
    if (!currentUserId) return false

    try {
      const supabase = createClient()
      const { error: rpcErr } = await supabase.rpc('remove_friend', {
        target_user_id: friendId,
      })

      if (rpcErr) throw rpcErr

      toast.success('Removed from friends.')
      await fetchFriendData()
      return true
    } catch (err: any) {
      console.error('Error unfriending:', err)
      toast.error(err?.message || 'Failed to unfriend.')
      return false
    }
  }

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
    refresh: fetchFriendData,
  }
}
