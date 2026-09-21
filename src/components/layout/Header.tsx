'use client'

import Link from 'next/link'
import { Settings, Search } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'
import { Profile } from '@/lib/types'
import NotificationBell from '../notifications/NotificationBell'

interface HeaderProps {
  currentUserId?: string
  userProfile?: Profile | null
}

export default function Header({ currentUserId, userProfile }: HeaderProps) {
  const userName = userProfile?.display_name || userProfile?.username || 'Profile'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e7] bg-white/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/home" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
            N
          </div>
          <span className="font-bold text-lg tracking-tight text-black">
            {APP_NAME}
          </span>
        </Link>

        {/* Right Section: Search + Notifications + Profile + Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/search"
            className="p-2 rounded-full text-[#555555] hover:text-black hover:bg-[#f5f5f7] transition-colors"
            title="Search Users"
          >
            <Search className="w-5 h-5" />
          </Link>

          <NotificationBell currentUserId={currentUserId} />

          <Link
            href="/profile"
            className="flex items-center gap-2 p-1.5 rounded-full border border-[#e5e5e7] hover:border-[#d2d2d7] bg-[#f5f5f7] transition-all"
            title="View Profile"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white border border-[#e5e5e7] flex items-center justify-center text-xs font-bold text-black">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {userProfile?.username && (
              <span className="hidden sm:inline text-xs font-semibold text-black pr-2">
                @{userProfile.username}
              </span>
            )}
          </Link>

          <Link
            href="/settings"
            className="p-2 rounded-full text-[#555555] hover:text-black hover:bg-[#f5f5f7] transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
