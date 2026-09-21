'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserSettings } from '@/lib/types'
import { toast } from 'sonner'

export function useUserSettings(currentUserId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUserId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No record exists yet, create default
        const defaultSettings: UserSettings = {
          user_id: currentUserId,
          theme: 'dark',
          notification_prefs: {
            messages: true,
            stories: true,
          },
          updated_at: new Date().toISOString(),
        }

        const { data: newSettings, error: insertErr } = await supabase
          .from('user_settings')
          .insert(defaultSettings)
          .select('*')
          .single()

        if (!insertErr && newSettings) {
          setSettings(newSettings as UserSettings)
        } else {
          setSettings(defaultSettings)
        }
      } else if (data) {
        setSettings(data as UserSettings)
      }
    } catch (err) {
      console.error('Error fetching user settings:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Update notification preferences
  const updateNotificationPrefs = async (
    key: 'messages' | 'stories',
    value: boolean
  ) => {
    if (!currentUserId || !settings) return

    const updatedPrefs = {
      ...settings.notification_prefs,
      [key]: value,
    }

    try {
      setSaving(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUserId,
          theme: settings.theme,
          notification_prefs: updatedPrefs,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSettings((prev) => (prev ? { ...prev, notification_prefs: updatedPrefs } : prev))
      toast.success('Notification preferences saved.')
    } catch (err: any) {
      console.error('Error updating notification prefs:', err)
      toast.error('Failed to update notification settings.')
    } finally {
      setSaving(false)
    }
  }

  // Update theme setting
  const updateTheme = async (theme: 'dark' | 'light') => {
    if (!currentUserId || !settings) return

    try {
      setSaving(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUserId,
          theme,
          notification_prefs: settings.notification_prefs,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSettings((prev) => (prev ? { ...prev, theme } : prev))
      toast.success(`Theme set to ${theme} mode.`)
    } catch (err) {
      console.error('Error updating theme:', err)
      toast.error('Failed to update theme.')
    } finally {
      setSaving(false)
    }
  }

  return {
    settings,
    loading,
    saving,
    updateNotificationPrefs,
    updateTheme,
  }
}
