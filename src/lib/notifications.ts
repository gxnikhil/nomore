import { createClient } from './supabase/client'

export type NotificationType = 'chat' | 'story' | 'friend_request' | 'friend_accept' | 'story_reply'

/**
 * Sends a notification to a recipient user.
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const activeSenderId = senderId || user?.id
    if (!recipientId || !activeSenderId) return false

    const { error } = await supabase.from('notifications').insert({
      recipient_id: recipientId,
      sender_id: activeSenderId,
      type,
      title,
      body: body || null,
      data,
    })

    if (error) {
      console.error('Error inserting notification:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Failed to send notification:', err)
    return false
  }
}
