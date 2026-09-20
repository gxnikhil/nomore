'use client'

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react'
import { useChat } from '@/hooks/useChat'
import { useDashboard } from '@/hooks/useDashboard'
import MessageBubble from '@/components/chat/MessageBubble'
import MediaViewerModal from '@/components/chat/MediaViewerModal'
import {
  MessageCircle,
  ShieldCheck,
  Send,
  Paperclip,
  Lock,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Heart,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Message } from '@/lib/types'

export default function ChatPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''
  const partnerProfile = dash.partnerProfile

  const {
    messages,
    loading,
    sending,
    isKeyInitializing,
    partnerHasKey,
    partnerIsTyping,
    sendMessage,
    sendMediaMessage,
    reactToMessage,
    markAsRead,
    deleteMessage,
    deleteMessages,
    setTypingState,
  } = useChat(currentUserId, partnerProfile)

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

  // Scroll to bottom on new message
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
      setInput(textToSend) // Restore on failure
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

  const partnerName = partnerProfile?.display_name || partnerProfile?.username || 'Partner'

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto animate-fade-in">
      {/* 1. Chat Header Bar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--color-border)] flex items-center justify-between shrink-0 mb-3">
        {isSelectMode ? (
          /* Multi-select Header Toolbar */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsSelectMode(false)
                  setSelectedIds([])
                }}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                {selectedIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllOwn}
                className="text-xs px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
              >
                {selectedIds.length === ownMessageIds.length ? 'Deselect All' : 'Select All Own'}
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 text-red-300 border border-red-800/60 hover:bg-red-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for Everyone ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Header */
          <>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center font-bold text-sm text-[var(--color-accent)]">
                {partnerProfile?.avatar_url ? (
                  <img
                    src={partnerProfile.avatar_url}
                    alt={partnerName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{partnerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="font-display font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>{partnerName}</span>
                </h2>
                <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ECDH P-256 + AES-256-GCM End-to-End Encrypted</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSelectMode(true)}
                title="Select messages"
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Select</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Knowledge Server</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Messages Display Area */}
      <div className="flex-1 glass-card p-4 rounded-2xl border border-[var(--color-border)] overflow-y-auto space-y-3 flex flex-col">
        {isKeyInitializing || loading || !currentUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-[var(--color-text-muted)]">
            <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
            <p className="text-xs">Establishing E2EE keys & loading private messages...</p>
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
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
              <Heart className="w-8 h-8 fill-[var(--color-accent)]/20" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
              Your Private Conversation
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm">
              Messages are encrypted on your device before sending. Supabase servers never see plaintext.
            </p>
          </div>
        )}

        {/* Partner Typing Indicator */}
        {partnerIsTyping && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-accent-light)] italic pl-2 py-1 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{partnerName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Reply Target Bar */}
      {replyTo && (
        <div className="mt-2 p-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
          <div className="truncate">
            <span className="font-semibold text-[var(--color-accent-light)] mr-1">
              Replying to:
            </span>
            <span className="italic">
              "{replyTo.decrypted_content || 'Media attachment'}"
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Composer Input Bar */}
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
          className="p-3 rounded-xl btn-secondary text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
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
          placeholder={`Type a private message to ${partnerName}...`}
          aria-label="Private message text"
          disabled={sending}
          className="input-field flex-1 py-3"
        />

        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Send private message"
          className="btn-primary p-3 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
