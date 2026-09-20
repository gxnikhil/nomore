'use client'

import { useState } from 'react'
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
  Moon,
  Sun,
  Lock,
  HardDrive,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'

export default function SettingsPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''
  const myEmail = dash.myProfile?.email || 'Authorized Account'

  const { settings, loading, updateNotificationPrefs, updateTheme } = useUserSettings(currentUserId)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
          <Settings className="w-7 h-7 text-[var(--color-accent)]" />
          Settings & Security
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1">
          Account preferences, notification controls, and factual security status.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Account Section */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
          <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Account</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase block">
                Signed-in Google Account
              </span>
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                {myEmail}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <span>Edit Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="btn-secondary text-xs py-2 px-3.5 border-red-900/40 text-red-300 hover:bg-red-950/40 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Appearance Section */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
          <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-2">
            <Moon className="w-4 h-4 text-amber-400" />
            <span>Appearance & Theme</span>
          </h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
                Theme Mode
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Cinematic dark palette (recommended) or light mode
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[var(--color-bg-primary)] p-1 rounded-xl border border-[var(--color-border)]">
              <button
                onClick={() => updateTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  settings?.theme === 'dark'
                    ? 'bg-[var(--color-accent)] text-slate-950 shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                onClick={() => updateTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  settings?.theme === 'light'
                    ? 'bg-[var(--color-accent)] text-slate-950 shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Notifications Preferences Section */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
          <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <span>Notification Preferences</span>
          </h3>

          {loading ? (
            <div className="h-32 skeleton rounded-xl" />
          ) : (
            <div className="space-y-2">
              {[
                { key: 'messages', label: 'Private Chat Messages', desc: 'Alerts when new chat messages arrive' },
                { key: 'stories', label: 'Ephemeral Stories', desc: 'Alerts when a new 24h story is posted' },
                { key: 'albums', label: 'Shared Albums', desc: 'Alerts when photos/videos are added to albums' },
                { key: 'memories', label: 'Timeline Memories', desc: 'Alerts when memories are saved to timeline' },
              ].map((item) => {
                const isEnabled = Boolean(
                  settings?.notification_prefs?.[
                    item.key as keyof typeof settings.notification_prefs
                  ]
                )

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {item.desc}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        updateNotificationPrefs(
                          item.key as 'messages' | 'stories' | 'albums' | 'memories',
                          !isEnabled
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                        isEnabled ? 'bg-[var(--color-accent)]' : 'bg-stone-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-950 transition-transform ${
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

        {/* 4. Factual Security & Architecture Overview */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)]">
              Factual Architecture & Security Status
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Google OAuth */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] block mb-0.5">
                  Google OAuth Allowlist
                </span>
                <p className="text-[var(--color-text-muted)]">
                  Access is strictly restricted via Supabase Auth Hook and database triggers to the two designated Google accounts. Public registration, invite codes, and username search are permanently disabled.
                </p>
              </div>
            </div>

            {/* PostgreSQL RLS */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] block mb-0.5">
                  Database Row Level Security (RLS)
                </span>
                <p className="text-[var(--color-text-muted)]">
                  Every table enforces strict RLS policies tied to <code className="text-[var(--color-accent-light)]">is_nomore_member(auth.uid())</code>. Anonymous access and unauthenticated queries are rejected at the database engine level.
                </p>
              </div>
            </div>

            {/* End-to-End Encrypted Text Chat */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] block mb-0.5">
                  End-to-End Encrypted Text Messages (Web Crypto API)
                </span>
                <p className="text-[var(--color-text-muted)]">
                  Text messages are encrypted locally on device using Web Crypto ECDH P-256 key agreement + AES-256-GCM symmetric encryption. Private keys remain exclusively in client IndexedDB and are zero-knowledge to Supabase servers.
                </p>
              </div>
            </div>

            {/* Private Storage & Media Note */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] block mb-0.5">
                  Private Storage Buckets & Media Security Note
                </span>
                <p className="text-[var(--color-text-muted)]">
                  Media files (avatars, stories, chat media, album media, memories) are stored in private Supabase Storage buckets (<code className="text-[var(--color-accent-light)]">public = false</code>), protected in transit by TLS and served exclusively via short-lived authenticated signed URLs. Media files are NOT client-side E2EE to maintain mobile browser performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
