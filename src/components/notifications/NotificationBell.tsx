'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from './NotificationCenter'

interface NotificationBellProps {
  currentUserId: string | undefined
}

export default function NotificationBell({ currentUserId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(currentUserId)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape keypress
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!currentUserId) return null

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors relative"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[var(--color-rose)] to-[var(--color-accent)] text-slate-950 font-bold text-[10px] flex items-center justify-center border-2 border-[var(--color-bg-primary)] shadow-md animate-pulse">
            {displayCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Center */}
      <NotificationCenter
        isOpen={isOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onClose={() => setIsOpen(false)}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  )
}
