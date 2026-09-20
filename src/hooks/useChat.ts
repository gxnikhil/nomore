'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, MessageMedia, Profile } from '@/lib/types'
import { useEncryption } from './useEncryption'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'

export function useChat(currentUserId: string | undefined, partnerProfile: Profile | null) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [partnerIsTyping, setPartnerIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const partnerId = partnerProfile?.id

  // E2EE crypto hook
  const {
    sharedKey,
    isInitializing: isKeyInitializing,
    partnerHasKey,
    encryptText,
    decryptText,
  } = useEncryption(currentUserId, partnerId)

  // 1. Get or create conversation for the space
  const initConversation = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false)
      return null
    }

    try {
      const supabase = createClient()

      // Get space ID
      const { data: spaceMember } = await supabase
        .from('private_space_members')
        .select('space_id')
        .eq('auth_user_id', currentUserId)
        .single()

      if (!spaceMember) return null
      const spaceId = spaceMember.space_id

      // Check existing conversation
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('space_id', spaceId)
        .limit(1)

      let convId = convs?.[0]?.id

      // If no conversation exists, create it
      if (!convId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ space_id: spaceId })
          .select('id')
          .single()

        if (convErr) throw convErr
        convId = newConv.id

        // Enroll members
        await supabase.from('conversation_members').insert([
          { conversation_id: convId, user_id: currentUserId },
          ...(partnerId ? [{ conversation_id: convId, user_id: partnerId }] : []),
        ])
      }

      setConversationId(convId)
      return convId
    } catch (err) {
      console.error('Failed to init conversation:', err)
      return null
    }
  }, [currentUserId, partnerId])

  // 2. Fetch messages & decrypt content
  const fetchMessages = useCallback(
    async (convId: string) => {
      try {
        setLoading(true)
        const supabase = createClient()

        const { data: rawMsgs, error: msgsErr } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(*),
            media:message_media(*),
            reactions:message_reactions(*),
            read_status:message_read_status(*)
          `)
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })

        if (msgsErr) throw msgsErr

        if (!rawMsgs) {
          setMessages([])
          setLoading(false)
          return
        }

        // Decrypt messages & resolve media signed URLs
        const processedMessages: Message[] = await Promise.all(
          rawMsgs.map(async (msg) => {
            let decrypted = msg.encrypted_content
            if (msg.encrypted_content && msg.iv) {
              decrypted = await decryptText(msg.encrypted_content, msg.iv)
            }

            let mediaWithUrls: MessageMedia[] = []
            if (msg.media && msg.media.length > 0) {
              mediaWithUrls = await Promise.all(
                msg.media.map(async (m: MessageMedia) => ({
                  ...m,
                  media_url: (await getSignedMediaUrl(BUCKETS.MESSAGES, m.storage_path)) || undefined,
                }))
              )
            }

            return {
              ...msg,
              decrypted_content: decrypted || '',
              media: mediaWithUrls,
            }
          })
        )

        setMessages(processedMessages)
      } catch (err) {
        console.error('Failed to fetch messages:', err)
      } finally {
        setLoading(false)
      }
    },
    [decryptText]
  )

  useEffect(() => {
    initConversation().then((convId) => {
      if (convId) fetchMessages(convId)
    })
  }, [initConversation, fetchMessages])

  // 3. Realtime subscription for messages & presence
  useEffect(() => {
    if (!conversationId || !currentUserId) return
    const supabase = createClient()

    // Database Realtime Channel
    const dbChannel = supabase
      .channel(`chat_messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          fetchMessages(conversationId)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          fetchMessages(conversationId)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_read_status' },
        () => {
          fetchMessages(conversationId)
        }
      )
      .subscribe()

    // Typing & Presence Channel
    const presenceChannel = supabase.channel(`chat_presence:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        if (partnerId && state[partnerId]) {
          const partnerData = state[partnerId][0] as any
          setPartnerIsTyping(Boolean(partnerData?.isTyping))
        } else {
          setPartnerIsTyping(false)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [conversationId, currentUserId, partnerId, fetchMessages])

  // Broadcast typing indicator
  const setTypingState = (typing: boolean) => {
    if (!conversationId || !currentUserId) return
    setIsTyping(typing)
    const supabase = createClient()
    const presenceChannel = supabase.channel(`chat_presence:${conversationId}`)
    presenceChannel.track({ isTyping: typing, user_id: currentUserId })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        presenceChannel.track({ isTyping: false, user_id: currentUserId })
      }, 3000)
    }
  }

  // 4. Send encrypted text message
  const sendMessage = async (text: string, replyToId?: string): Promise<boolean> => {
    if (!conversationId || !currentUserId || !text.trim()) return false

    const encrypted = await encryptText(text.trim())
    if (!encrypted) {
      toast.error('Could not encrypt message.')
      return false
    }

    try {
      setSending(true)
      const supabase = createClient()

      const { error: sendErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        message_type: replyToId ? 'reply' : 'text',
        reply_to_id: replyToId || null,
      })

      if (sendErr) throw sendErr

      // Trigger private notification to partner
      if (partnerId) {
        sendPrivateNotification({
          recipientId: partnerId,
          senderId: currentUserId,
          type: 'chat',
          title: 'New Private Message',
          body: 'Sent you a new message in Chat',
          data: { route: '/chat' },
        })
      }

      setTypingState(false)
      await fetchMessages(conversationId)
      return true
    } catch (err: any) {
      console.error('Error sending message:', err)
      toast.error('Failed to send message.')
      return false
    } finally {
      setSending(false)
    }
  }

  // 5. Send media message (photo/video)
  const sendMediaMessage = async (file: File): Promise<boolean> => {
    if (!conversationId || !currentUserId) return false

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file.')
      return false
    }

    try {
      setSending(true)
      const supabase = createClient()
      const mediaType = getMediaType(file.type)
      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `${conversationId}/${crypto.randomUUID()}.${fileExt}`

      // Upload file to private messages bucket
      const { error: uploadErr } = await uploadPrivateFile(BUCKETS.MESSAGES, storagePath, file)
      if (uploadErr) throw uploadErr

      // Insert message record
      const { data: newMsg, error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          message_type: 'media',
        })
        .select('id')
        .single()

      if (msgErr) throw msgErr

      // Insert message_media metadata
      const { error: mediaErr } = await supabase.from('message_media').insert({
        message_id: newMsg.id,
        storage_path: storagePath,
        media_type: mediaType,
        mime_type: file.type,
        file_name: file.name,
        file_size: file.size,
      })

      if (mediaErr) throw mediaErr

      if (partnerId) {
        sendPrivateNotification({
          recipientId: partnerId,
          senderId: currentUserId,
          type: 'chat',
          title: 'New Media Shared',
          body: `Shared a ${mediaType} in Chat`,
          data: { route: '/chat' },
        })
      }

      toast.success('Media sent!')
      await fetchMessages(conversationId)
      return true
    } catch (err: any) {
      console.error('Error sending media message:', err)
      toast.error(err?.message || 'Failed to send media.')
      return false
    } finally {
      setSending(false)
    }
  }

  // 6. React to message
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) return
    try {
      const supabase = createClient()
      const { error: reactErr } = await supabase
        .from('message_reactions')
        .upsert({ message_id: messageId, user_id: currentUserId, emoji })

      if (reactErr) throw reactErr
      if (conversationId) fetchMessages(conversationId)
    } catch (err) {
      console.error('Failed to react to message:', err)
    }
  }

  // 7. Mark message as read
  const markAsRead = async (messageId: string) => {
    if (!currentUserId) return
    try {
      const supabase = createClient()
      await supabase
        .from('message_read_status')
        .upsert({ message_id: messageId, user_id: currentUserId })
    } catch (err) {
      console.error('Failed to mark read status:', err)
    }
  }

  // 8. Delete own message
  const deleteMessage = async (messageId: string) => {
    if (!currentUserId || !conversationId) return

    const targetMsg = messages.find((m) => m.id === messageId)
    if (!targetMsg || targetMsg.sender_id !== currentUserId) {
      toast.error('You can only delete your own messages.')
      return
    }

    try {
      const supabase = createClient()

      // Delete storage files if media message
      if (targetMsg.media && targetMsg.media.length > 0) {
        for (const m of targetMsg.media) {
          await deletePrivateFile(BUCKETS.MESSAGES, m.storage_path)
        }
      }

      // Delete message record
      const { error: delErr } = await supabase.from('messages').delete().eq('id', messageId)
      if (delErr) throw delErr

      toast.success('Message deleted.')
      await fetchMessages(conversationId)
    } catch (err: any) {
      console.error('Error deleting message:', err)
      toast.error('Failed to delete message.')
    }
  }

  return {
    conversationId,
    messages,
    loading,
    sending,
    isKeyInitializing,
    partnerHasKey,
    isTyping,
    partnerIsTyping,
    sendMessage,
    sendMediaMessage,
    reactToMessage,
    markAsRead,
    deleteMessage,
    setTypingState,
  }
}
