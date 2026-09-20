'use client'

import { useState } from 'react'
import { Message, MessageMedia } from '@/lib/types'
import { formatMessageTime, triggerDownload } from '@/lib/utils'
import { Lock, Trash2, Reply, Download, Check, CheckCheck, Smile, Play } from 'lucide-react'
import { QUICK_REACTIONS } from '@/lib/constants'

interface MessageBubbleProps {
  message: Message
  currentUserId: string
  onReact: (messageId: string, emoji: string) => void
  onDelete: (messageId: string) => void
  onReply: (message: Message) => void
  onOpenMedia: (media: MessageMedia) => void
}

export default function MessageBubble({
  message,
  currentUserId,
  onReact,
  onDelete,
  onReply,
  onOpenMedia,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)
  const isSentByMe = message.sender_id === currentUserId
  const isRead = Boolean(message.read_status && message.read_status.length > 0)

  return (
    <div
      className={`flex flex-col group relative my-1.5 ${
        isSentByMe ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender Avatar & Name for received messages */}
      {!isSentByMe && message.sender && (
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] mb-1 ml-2">
          {message.sender.display_name || 'Partner'}
        </span>
      )}

      {/* Bubble Box */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] p-3.5 shadow-md transition-all ${
          isSentByMe
            ? 'chat-bubble-sent border border-[var(--color-accent-dark)]/40'
            : 'chat-bubble-received border border-[var(--color-border)]'
        }`}
      >
        {/* Media Attachments */}
        {message.media && message.media.length > 0 && (
          <div className="space-y-2 mb-2">
            {message.media.map((media: MessageMedia) => (
              <div
                key={media.id}
                className="relative rounded-xl overflow-hidden bg-black/40 border border-white/10 group/media cursor-pointer"
                onClick={() => media.media_url && onOpenMedia(media)}
              >
                {media.media_url ? (
                  media.media_type === 'image' ? (
                    <img
                      src={media.media_url}
                      alt={media.file_name || 'Media'}
                      className="w-full max-h-[250px] object-cover rounded-lg"
                    />
                  ) : (
                    <div className="relative w-full max-h-[250px] flex items-center justify-center bg-black">
                      <video
                        src={media.media_url}
                        className="w-full max-h-[250px] object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-4 text-xs text-center text-white/60">Loading media...</div>
                )}

                {/* Save/Download Badge */}
                {media.media_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerDownload(media.media_url!, media.file_name || 'download')
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black"
                    title="Download to device"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Message Content */}
        {message.decrypted_content && (
          <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap break-words">
            {message.decrypted_content}
          </p>
        )}

        {/* Footer Meta: Time, Read Status, E2EE Icon */}
        <div
          className={`flex items-center gap-1.5 text-[10px] mt-1.5 ${
            isSentByMe ? 'text-amber-100/70 justify-end' : 'text-[var(--color-text-muted)] justify-end'
          }`}
        >
          {/* E2EE Lock Icon */}
          <Lock className="w-2.5 h-2.5 opacity-60" />

          <span>{formatMessageTime(message.created_at)}</span>

          {/* Read Receipt */}
          {isSentByMe && (
            <span>
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-amber-200/60 inline" />
              )}
            </span>
          )}
        </div>

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="absolute -bottom-3 right-2 flex items-center gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-full px-2 py-0.5 shadow-md">
            {message.reactions.map((r) => (
              <span key={r.id} className="text-xs">
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Menu (Hover) */}
      <div
        className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 ${
          isSentByMe ? 'mr-1' : 'ml-1'
        }`}
      >
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          title="React"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onReply(message)}
          className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {isSentByMe && (
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 rounded-full text-red-400/70 hover:text-red-300 hover:bg-red-950/40"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Emoji Picker Popup */}
      {showReactions && (
        <div className="absolute bottom-full mb-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-full p-1.5 shadow-xl flex items-center gap-1 z-20 animate-fade-in">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji)
                setShowReactions(false)
              }}
              className="p-1 hover:scale-125 transition-transform text-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
