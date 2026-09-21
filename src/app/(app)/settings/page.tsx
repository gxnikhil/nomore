'use client'

import { useState, useEffect } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useDashboard } from '@/hooks/useDashboard'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Settings,
  Shield,
  LogOut,
  User,
  Bell,
  HardDrive,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

export default function SettingsPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''
  const myUsername = dash.myProfile?.username || ''
  const [myEmail, setMyEmail] = useState<string>('Authenticated Account')

  const { settings, loading, updateNotificationPrefs } = useUserSettings(currentUserId)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setMyEmail(data.user.email)
      }
    })
  }, [])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      router.push('/login')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12 text-black">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
          <Settings className="w-6 h-6 text-black" />
          <span>Settings & Security</span>
        </h1>
        <p className="text-xs text-[#555555]">
          Account settings, notification preferences, and platform security.
        </p>
      </div>

      <div className="space-y-5">
        {/* 1. Account Section */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e7] shadow-sm space-y-4">
          <h3 className="font-semibold text-base text-black flex items-center gap-2">
            <User className="w-4 h-4 text-black" />
            <span>Account</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7]">
            <div>
              <span className="text-xs font-semibold text-[#86868b] uppercase block">
                Signed-in Account
              </span>
              <span className="text-sm font-bold text-black block">
                {myEmail}
              </span>
              {myUsername && (
                <span className="text-xs text-[#555555]">
                  @{myUsername}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              >
                <span>Edit Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3.5 py-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Notifications Preferences Section */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e7] shadow-sm space-y-4">
          <h3 className="font-semibold text-base text-black flex items-center gap-2">
            <Bell className="w-4 h-4 text-black" />
            <span>Notifications</span>
          </h3>

          {loading ? (
            <div className="h-24 bg-[#f5f5f7] animate-pulse rounded-2xl" />
          ) : (
            <div className="space-y-2">
              {[
                { key: 'messages', label: 'Direct Messages', desc: 'Alerts when friends send new messages' },
                { key: 'stories', label: 'Ephemeral Stories', desc: 'Alerts when friends post new 24h stories' },
              ].map((item) => {
                const isEnabled = Boolean(
                  settings?.notification_prefs?.[
                    item.key as keyof typeof settings.notification_prefs
                  ]
                )

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7]"
                  >
                    <div>
                      <span className="text-xs font-semibold text-black block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[#555555]">
                        {item.desc}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        updateNotificationPrefs(
                          item.key as 'messages' | 'stories',
                          !isEnabled
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                        isEnabled ? 'bg-black' : 'bg-[#e5e5e7]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 3. Security Overview */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e7] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-black" />
            <h3 className="font-semibold text-base text-black">
              Platform Architecture & Security
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7] flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-black block mb-0.5">
                  Row Level Security (RLS) & Friendship Gating
                </span>
                <p className="text-[#555555]">
                  Private content (chat messages, media, and 24h stories) is strictly protected at the database engine level via RLS policies. Only accepted friends can interact and view private content.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7] flex items-start gap-3">
              <Shield className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-black block mb-0.5">
                  Private Storage Buckets
                </span>
                <p className="text-[#555555]">
                  All user media (avatars, chat attachments, stories) are stored in private Supabase Storage buckets (<code className="text-black font-semibold">public = false</code>) and served via authenticated signed URLs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
