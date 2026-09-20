'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { Heart, Sparkles, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      if (error === 'unauthorized') {
        setErrorMsg('This private space is not available for this account.')
      } else {
        setErrorMsg('Authentication failed. Please try again.')
      }
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const supabase = createClient()
      const origin = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Login error:', err)
      setErrorMsg(err?.message || 'Failed to initialize Google login.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md glass-card p-8 sm:p-10 flex flex-col items-center text-center relative z-10 animate-fade-in border border-[var(--color-border)] shadow-2xl">
      {/* Brand Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-rose)] p-[1px] mb-6 flex items-center justify-center shadow-lg shadow-[var(--color-accent-glow)]">
        <div className="w-full h-full bg-[var(--color-bg-primary)] rounded-[15px] flex items-center justify-center">
          <Heart className="w-8 h-8 text-[var(--color-accent)] fill-[var(--color-accent)]/20" />
        </div>
      </div>

      {/* Title & Tagline */}
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-text-primary)] via-[var(--color-accent-light)] to-[var(--color-text-primary)] bg-clip-text text-transparent mb-2">
        {APP_NAME}
      </h1>
      <p className="text-[var(--color-text-secondary)] text-sm sm:text-base font-medium mb-8 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-[var(--color-accent)] inline" />
        {APP_TAGLINE}
      </p>

      {/* Error message display */}
      {errorMsg && (
        <div className="w-full bg-red-950/40 border border-red-800/50 rounded-xl p-3 mb-6 text-red-200 text-xs sm:text-sm flex items-start gap-2 text-left">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* OAuth Action Button */}
      <div className="w-full space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
        </button>

        <p className="text-xs text-[var(--color-text-muted)] mt-4">
          Private 2-person space. Invites & public registration are disabled.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh gradient-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle ambient decorative elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-accent-glow)] rounded-full blur-3xl pointer-events-none opacity-40" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none opacity-30" />

      <Suspense fallback={
        <div className="w-full max-w-md glass-card p-8 text-center border border-[var(--color-border)]">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  )
}

