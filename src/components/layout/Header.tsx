'use client'

import Link from 'next/link'
import { Heart, Settings } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import { Profile } from '@/lib/types'
import NotificationBell from '../notifications/NotificationBell'

interface HeaderProps {
  currentUserId?: string
  partnerProfile?: Profile | null
  isPartnerOnline?: boolean
}

export default function Header({ currentUserId, partnerProfile, isPartnerOnline }: HeaderProps) {
  const partnerName = partnerProfile?.display_name || partnerProfile?.username || 'Partner'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/home" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-rose)] p-[1px] shadow-sm transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[var(--color-bg-primary)] rounded-[11px] flex items-center justify-center">
              <Heart className="w-4 h-4 text-[var(--color-accent)] fill-[var(--color-accent)]/20" />
            </div>
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-[var(--color-text-primary)]">
              {APP_NAME}
            </span>
          </div>
        </Link>

        {/* Right Section: Notification Bell + Partner Presence + Settings */}
        <div className="flex items-center gap-3">
          {/* Real-time Notification Bell */}
          <NotificationBell currentUserId={currentUserId} />

          {/* Partner Presence Bar */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-all"
            title={`View ${partnerName}'s profile`}
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border-light)] flex items-center justify-center text-xs font-medium text-[var(--color-accent)]">
              {partnerProfile?.avatar_url ? (
                <img
                  src={partnerProfile.avatar_url}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{partnerName.charAt(0).toUpperCase()}</span>
              )}

              {/* Online badge */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-primary)] ${
                  isPartnerOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-stone-600'
                }`}
              />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none text-[var(--color-text-primary)]">
                {partnerName}
              </span>
              <span className="text-[10px] leading-tight text-[var(--color-text-muted)] flex items-center gap-1">
                {isPartnerOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </>
                ) : (
                  'Away'
                )}
              </span>
            </div>
          </Link>

          {/* Quick Settings Icon */}
          <Link
            href="/settings"
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
