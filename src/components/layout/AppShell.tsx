'use client'

import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Profile } from '@/lib/types'

interface AppShellProps {
  children: React.ReactNode
  userId: string
  userProfile?: Profile | null
}

export default function AppShell({ children, userId, userProfile }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#ffffff] text-black">
      {/* Top Header */}
      <Header currentUserId={userId} userProfile={userProfile} />

      {/* Body container with Sidebar & Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <BottomNav />
    </div>
  )
}
