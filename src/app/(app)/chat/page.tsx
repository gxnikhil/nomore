'use client'

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react'
import { useChat } from '@/hooks/useChat'
import { useDashboard } from '@/hooks/useDashboard'
import { useFriends } from '@/hooks/useFriends'
import MessageBubble from '@/components/chat/MessageBubble'
import MediaViewerModal from '@/components/chat/MediaViewerModal'
import {
  MessageCircle,
  Send,
  Paperclip,
  X,
  Sparkles,
  Loader2,
  Trash2,
  CheckSquare,
  Shield,
  Users,
} from 'lucide-react'
import { Message, Profile } from '@/lib/types'

export default function ChatPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''
  const { friends } = useFriends(currentUserId)

  const [selectedPartner, setSelectedPartner] = useState<Profile | null>(null)

  // Default to first friend if none selected
  useEffect(() => {
    if (!selectedPartner && friends.length > 0) {
      setSelectedPartner(friends[0])
    }
  }, [friends, selectedPartner])

  const {
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
  } = useChat(currentUserId, selectedPartner)

  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeMedia, setActiveMedia] = useState<{
    url: string
    type: 'image' | 'video'
    name: string
    storagePath?: string
    mimeType?: string | null
    fileSize?: number | null
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partnerIsTyping])

  const handleSendText = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const textToSend = input
    setInput('')
    const success = await sendMessage(textToSend, replyTo?.id)
    if (success) {
      setReplyTo(null)
    } else {
      setInput(textToSend)
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || sending) return
    await sendMediaMessage(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleSelectMessage = (messageId: string) => {
    setSelectedIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    )
  }

  const ownMessageIds = messages.filter((m) => m.sender_id === currentUserId).map((m) => m.id)

  const handleSelectAllOwn = () => {
    if (selectedIds.length === ownMessageIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(ownMessageIds)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const success = await deleteMessages(selectedIds)
    if (success) {
      setSelectedIds([])
      setIsSelectMode(false)
    }
  }

  const partnerName = selectedPartner?.display_name || selectedPartner?.username || 'Friend'

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto animate-fade-in">
      {/* 1. Friends Selector Strip (if multiple friends exist) */}
      {friends.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
          {friends.map((f) => {
            const isSelected = selectedPartner?.id === f.id
            return (
              <button
                key={f.id}
                onClick={() => setSelectedPartner(f)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-[#555555] border-[#e5e5e7] hover:bg-[#f5f5f7]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#e8e8ed] text-black flex items-center justify-center text-[10px]">
                  {(f.display_name || f.username || 'F').charAt(0).toUpperCase()}
                </span>
                <span>{f.display_name || f.username}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 2. Chat Header Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#e5e5e7] flex items-center justify-between shrink-0 mb-3 shadow-sm">
        {isSelectMode ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsSelectMode(false)
                  setSelectedIds([])
                }}
                className="p-1.5 rounded-lg text-[#555555] hover:text-black hover:bg-[#f5f5f7]"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="font-semibold text-sm text-black">
                {selectedIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllOwn}
                className="text-xs px-3 py-1.5 rounded-full border border-[#e5e5e7] text-[#555555] hover:text-black hover:bg-[#f5f5f7]"
              >
                {selectedIds.length === ownMessageIds.length ? 'Deselect All' : 'Select All Own'}
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for Everyone ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] flex items-center justify-center font-bold text-sm text-black shrink-0 overflow-hidden">
                {selectedPartner?.avatar_url ? (
                  <img
                    src={selectedPartner.avatar_url}
                    alt={partnerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{partnerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-base text-black flex items-center gap-2 leading-tight">
                  <span>{partnerName}</span>
                </h2>
                {selectedPartner?.username && (
                  <p className="text-[11px] text-[#555555] flex items-center gap-1">
                    <span>@{selectedPartner.username}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSelectMode(true)}
                title="Select messages"
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#e5e5e7] text-[#555555] hover:text-black hover:bg-[#f5f5f7] transition-colors flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Select</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Messages Display Area */}
      <div className="flex-1 bg-white p-4 rounded-2xl border border-[#e5e5e7] overflow-y-auto space-y-3 flex flex-col shadow-sm">
        {loading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-[#86868b]">
            <Loader2 className="w-6 h-6 text-black animate-spin" />
            <p className="text-xs">Loading conversation...</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3 mt-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUserId={currentUserId}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(msg.id)}
                onToggleSelect={toggleSelectMessage}
                onReact={reactToMessage}
                onDelete={deleteMessage}
                onReply={(m) => setReplyTo(m)}
                onOpenMedia={(m) =>
                  setActiveMedia({
                    url: m.media_url || '',
                    type: m.media_type,
                    name: m.file_name || 'attachment',
                    storagePath: m.storage_path,
                    mimeType: m.mime_type,
                    fileSize: m.file_size,
                  })
                }
              />
            ))}
          </div>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7] flex items-center justify-center text-black">
              <MessageCircle className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-lg text-black">
              Direct Conversation
            </h3>
            <p className="text-xs text-[#555555] max-w-sm">
              Send a private message to {partnerName}. Messages are protected by friendship RLS policies.
            </p>
          </div>
        )}

        {/* Partner Typing Indicator */}
        {partnerIsTyping && (
          <div className="flex items-center gap-2 text-xs text-[#555555] italic pl-2 py-1 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>{partnerName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Reply Target Bar */}
      {replyTo && (
        <div className="mt-2 p-2.5 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl flex items-center justify-between text-xs text-[#555555]">
          <div className="truncate">
            <span className="font-semibold text-black mr-1">
              Replying to:
            </span>
            <span className="italic">
              "{replyTo.decrypted_content || 'Media attachment'}"
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 text-[#86868b] hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Composer Input Bar */}
      <form onSubmit={handleSendText} className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Share photo or video attachment"
          className="p-3 rounded-full btn-secondary text-black disabled:opacity-50"
          title="Share photo or short video"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setTypingState(true)
          }}
          placeholder={`Message ${partnerName}...`}
          aria-label="Message text"
          disabled={sending}
          className="input-field flex-1 py-3 rounded-full"
        />

        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Send message"
          className="btn-primary p-3 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send message"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Fullscreen Media Viewer Modal */}
      <MediaViewerModal
        isOpen={Boolean(activeMedia)}
        mediaUrl={activeMedia?.url || null}
        mediaType={activeMedia?.type || 'image'}
        fileName={activeMedia?.name || null}
        storagePath={activeMedia?.storagePath || null}
        mimeType={activeMedia?.mimeType || null}
        fileSize={activeMedia?.fileSize || null}
        currentUserId={currentUserId}
        onClose={() => setActiveMedia(null)}
      />
    </div>
  )
}
