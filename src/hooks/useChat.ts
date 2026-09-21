'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, MessageMedia, Profile } from '@/lib/types'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { sendPrivateNotification } from '@/lib/notifications'
import { validateMediaFile, getMediaType } from '@/lib/utils'
import { BUCKETS } from '@/lib/constants'
import { toast } from 'sonner'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useChat(currentUserId: string | undefined, partnerProfile?: Profile | null) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [partnerIsTyping, setPartnerIsTyping] = useState(false)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const signedUrlCacheRef = useRef<Map<string, string>>(new Map())

  const partnerId = partnerProfile?.id

  // 1. Get or create conversation for the space/friends
  const initConversation = useCallback(async () => {
    if (!currentUserId) return null

    try {
      const supabase = createClient()

      // If partnerId is provided, get or create 1-on-1 direct conversation
      if (partnerId) {
        const { data: convId, error: rpcErr } = await supabase.rpc(
          'get_or_create_friend_conversation',
          { p_user2: partnerId }
        )

        if (!rpcErr && convId) {
          setConversationId(convId)
          return convId
        }
      }

      // Fallback: Check existing conversation for user
      const { data: convMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', currentUserId)
        .limit(1)

      let convId = convMembers?.[0]?.conversation_id

      if (!convId) {
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({})
          .select('id')
          .single()

        if (convErr) throw convErr
        convId = newConv.id

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

  // 2. Fetch messages & resolve signed URLs with ref caching
  const fetchMessages = useCallback(
    async (convId: string, isInitial = false) => {
      try {
        if (isInitial && messages.length === 0) setLoading(true)
        const supabase = createClient()

        const { data: rawMsgs, error: msgsErr } = await supabase
          .from('messages')
          .select(`
            *,
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

        // Fetch sender profiles separately
        const senderIds = Array.from(new Set(rawMsgs.map((m) => m.sender_id)))
        let senderMap = new Map()

        if (senderIds.length > 0) {
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', senderIds)

          senderMap = new Map((senderProfiles || []).map((p) => [p.id, p]))
        }

        // Resolve media signed URLs with local cache to prevent image re-flash flicker
        const processedMessages: Message[] = await Promise.all(
          rawMsgs.map(async (msg) => {
            const contentText = msg.content || (msg.encrypted_content ? '[Legacy encrypted message]' : '')

            let mediaWithUrls: MessageMedia[] = []
            if (msg.media && msg.media.length > 0) {
              mediaWithUrls = await Promise.all(
                msg.media.map(async (m: MessageMedia) => {
                  let cachedUrl = signedUrlCacheRef.current.get(m.storage_path)
                  if (!cachedUrl) {
                    cachedUrl = (await getSignedMediaUrl(BUCKETS.MESSAGES, m.storage_path)) || undefined
                    if (cachedUrl) {
                      signedUrlCacheRef.current.set(m.storage_path, cachedUrl)
                    }
                  }
                  return {
                    ...m,
                    media_url: cachedUrl,
                  }
                })
              )
            }

            return {
              ...msg,
              sender: senderMap.get(msg.sender_id) || undefined,
              decrypted_content: contentText,
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
    [messages.length]
  )

  const fetchMessagesRef = useRef(fetchMessages)
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages
  }, [fetchMessages])

  // Trigger conversation init and message fetch on mount / partnerId change
  useEffect(() => {
    if (!currentUserId) return
    initConversation().then((convId) => {
      if (convId) fetchMessages(convId, true)
    })
  }, [currentUserId, partnerId, initConversation, fetchMessages])

  // 3. Realtime subscription for messages & presence (reusing presence channel ref)
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
          fetchMessagesRef.current(conversationId, false)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          fetchMessagesRef.current(conversationId, false)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_read_status' },
        () => {
          fetchMessagesRef.current(conversationId, false)
        }
      )
      .subscribe()

    // Single stable Presence Channel
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

    presenceChannelRef.current = presenceChannel

    return () => {
      supabase.removeChannel(dbChannel)
      supabase.removeChannel(presenceChannel)
      presenceChannelRef.current = null
    }
  }, [conversationId, currentUserId, partnerId])

  // Broadcast typing indicator without creating new channels on keystroke
  const setTypingState = (typing: boolean) => {
    if (!conversationId || !currentUserId || !presenceChannelRef.current) return
    presenceChannelRef.current.track({ isTyping: typing, user_id: currentUserId })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        presenceChannelRef.current?.track({ isTyping: false, user_id: currentUserId })
      }, 3000)
    }
  }

  // 4. Send plaintext text message
  const sendMessage = async (text: string, replyToId?: string): Promise<boolean> => {
    if (!conversationId || !currentUserId || !text.trim()) return false

    try {
      setSending(true)
      const supabase = createClient()

      const { error: sendErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: text.trim(),
        message_type: replyToId ? 'reply' : 'text',
        reply_to_id: replyToId || null,
      })

      if (sendErr) throw sendErr

      if (partnerId) {
        sendPrivateNotification({
          recipientId: partnerId,
          senderId: currentUserId,
          type: 'chat',
          title: 'New Message',
          body: text.trim().slice(0, 60),
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

      const { error: uploadErr } = await uploadPrivateFile(BUCKETS.MESSAGES, storagePath, file)
      if (uploadErr) throw uploadErr

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
          body: `Shared a ${mediaType} in chat`,
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

  // 7. Delete own message for everyone
  const deleteMessage = async (messageId: string): Promise<boolean> => {
    if (!currentUserId || !conversationId) return false

    const targetMsg = messages.find((m) => m.id === messageId)
    if (!targetMsg || targetMsg.sender_id !== currentUserId) {
      toast.error('You can only delete your own messages.')
      return false
    }

    try {
      const supabase = createClient()

      if (targetMsg.media && targetMsg.media.length > 0) {
        for (const m of targetMsg.media) {
          const { error: storageErr } = await deletePrivateFile(BUCKETS.MESSAGES, m.storage_path)
          if (storageErr) {
            console.error('Storage file deletion error:', storageErr)
            throw new Error(`Storage cleanup failed for ${m.file_name || m.storage_path}. Aborting deletion.`)
          }
        }
      }

      const { error: delErr } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUserId)

      if (delErr) throw delErr

      toast.success('Deleted for everyone.')
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      return true
    } catch (err: any) {
      console.error('Error deleting message:', err)
      toast.error(err?.message || 'Failed to delete message.')
      return false
    }
  }

  // 8. Bulk delete own messages
  const deleteMessages = async (messageIds: string[]): Promise<boolean> => {
    if (!currentUserId || !conversationId || messageIds.length === 0) return false

    const targetMsgs = messages.filter((m) => messageIds.includes(m.id) && m.sender_id === currentUserId)
    if (targetMsgs.length === 0) return false

    const supabase = createClient()
    const successfulDeletedIds: string[] = []

    for (const msg of targetMsgs) {
      try {
        let storageSuccess = true
        if (msg.media && msg.media.length > 0) {
          for (const m of msg.media) {
            const { error: storageErr } = await deletePrivateFile(BUCKETS.MESSAGES, m.storage_path)
            if (storageErr) {
              storageSuccess = false
              break
            }
          }
        }

        if (!storageSuccess) continue

        const { error: delErr } = await supabase
          .from('messages')
          .delete()
          .eq('id', msg.id)
          .eq('sender_id', currentUserId)

        if (!delErr) {
          successfulDeletedIds.push(msg.id)
        }
      } catch (err) {
        console.error(`Error deleting message ${msg.id}:`, err)
      }
    }

    if (successfulDeletedIds.length > 0) {
      setMessages((prev) => prev.filter((m) => !successfulDeletedIds.includes(m.id)))
      toast.success(`Deleted ${successfulDeletedIds.length} message(s).`)
    }

    return successfulDeletedIds.length > 0
  }

  return {
    conversationId,
    messages,
    loading,
    sending,
    partnerIsTyping,
    sendMessage,
    sendMediaMessage,
    reactToMessage,
    deleteMessage,
    deleteMessages,
    setTypingState,
  }
}
