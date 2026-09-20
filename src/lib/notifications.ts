import { createClient } from './supabase/client'

export type NotificationType = 'chat' | 'story' | 'album' | 'memory'

const TYPE_PREF_MAP: Record<NotificationType, 'messages' | 'stories' | 'albums' | 'memories'> = {
  chat: 'messages',
  story: 'stories',
  album: 'albums',
  memory: 'memories',
}

/**
 * Sends a notification to the partner in the private space via secure RPC function.
 * Preference checking, sender validation, and recipient targeting are enforced server-side.
 */
export async function sendPrivateNotification({
  recipientId,
  senderId,
  type,
  title,
  body,
  data = {},
}: {
  recipientId?: string
  senderId?: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
}): Promise<boolean> {
  try {
    const supabase = createClient()

    const { data: result, error } = await supabase.rpc('create_private_notification', {
      p_type: type,
      p_title: title,
      p_body: body || null,
      p_data: data,
    })

    if (error) {
      console.error('Error sending private notification:', error)
      return false
    }

    return Boolean(result)
  } catch (err) {
    console.error('Failed to send private notification:', err)
    return false
  }
}

