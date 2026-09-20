'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PresenceState {
  isPartnerOnline: boolean
  lastSeen: string | null
}

export function usePresence(userId: string | undefined, partnerId: string | undefined) {
  const [presence, setPresence] = useState<PresenceState>({
    isPartnerOnline: false,
    lastSeen: null,
  })

  useEffect(() => {
    if (!userId || !partnerId) return

    const supabase = createClient()
    const channel = supabase.channel('nomore_presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const isOnline = Boolean(state[partnerId])
        setPresence((prev) => ({
          ...prev,
          isPartnerOnline: isOnline,
          lastSeen: isOnline ? 'Online now' : prev.lastSeen,
        }))
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key === partnerId) {
          setPresence({
            isPartnerOnline: true,
            lastSeen: 'Online now',
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === partnerId) {
          setPresence({
            isPartnerOnline: false,
            lastSeen: new Date().toISOString(),
          })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: userId,
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, partnerId])

  return presence
}
