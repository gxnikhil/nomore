'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'

export function useNotifications(currentUserId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (!data || data.length === 0) {
        setNotifications([])
        setLoading(false)
        return
      }

      // Fetch sender profiles separately to avoid invalid PostgREST relationship join
      const senderIds = Array.from(new Set(data.map((n) => n.sender_id).filter(Boolean)))
      let senderMap = new Map()

      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds)

        senderMap = new Map((profilesData || []).map((p) => [p.id, p]))
      }

      const notificationsWithSender: Notification[] = data.map((n) => ({
        ...n,
        sender: n.sender_id ? senderMap.get(n.sender_id) || undefined : undefined,
      }))

      setNotifications(notificationsWithSender)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time listener for incoming notifications
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`user_notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          fetchNotifications()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as Notification).id
                  ? { ...n, ...(payload.new as Notification) }
                  : n
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          if (payload.old) {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!currentUserId) return

    try {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_id', currentUserId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error('Error marking notification read:', err)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUserId) return

    try {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', currentUserId)
        .eq('is_read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all notifications read:', err)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
