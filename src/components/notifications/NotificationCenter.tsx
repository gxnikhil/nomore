'use client'

import { Notification } from '@/lib/types'
import { getRelativeTime } from '@/lib/utils'
import { MessageCircle, Flame, Images, FolderHeart, CheckCheck, BellOff, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NotificationCenterProps {
  isOpen: boolean
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

export default function NotificationCenter({
  isOpen,
  notifications,
  unreadCount,
  loading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const router = useRouter()

  if (!isOpen) return null

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
      case 'story':
        return <Flame className="w-4 h-4 text-amber-500" />
      case 'album':
        return <FolderHeart className="w-4 h-4 text-purple-400" />
      case 'memory':
        return <Images className="w-4 h-4 text-rose-400" />
      default:
        return <MessageCircle className="w-4 h-4 text-[var(--color-accent)]" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }

    const route = (notification.data as any)?.route || '/home'
    onClose()
    router.push(route)
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 glass-card rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden z-50 animate-fade-in">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-[var(--color-text-primary)]">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-slate-950">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              aria-label="Mark all notifications as read"
              className="text-[11px] text-[var(--color-accent-light)] hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Close notifications dropdown"
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
        {loading ? (
          <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
            Loading notifications...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[var(--color-bg-hover)] ${
                !n.is_read ? 'bg-[var(--color-accent-glow)]/10' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-light)] shrink-0">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-[var(--color-text-primary)] truncate">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                    {getRelativeTime(n.created_at)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">
                    {n.body}
                  </p>
                )}
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0 mt-1.5" />
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)] space-y-2">
            <BellOff className="w-6 h-6 mx-auto opacity-40" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
