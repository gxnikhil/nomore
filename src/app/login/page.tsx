'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

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
    <div className="login-card">
      <div className="mark w-[64px] h-[64px] mx-auto mb-4">
        <img
          src="/assets/nomore-logo.png"
          alt="NOMORE Logo"
          className="mark-img"
        />
      </div>
      <div className="reveal-content">
        <p className="wordmark font-light text-[20px] tracking-[6px] mb-[3px] text-[var(--text-1)] uppercase select-none">
          NOMORE
        </p>
        <p className="since text-[10px] font-normal tracking-[3px] text-[var(--text-2)] mb-[30px] uppercase select-none">
          SINCE 2026
        </p>
        <h1 className="text-[22px] font-medium text-[var(--text-1)] mb-[8px] tracking-tight">
          Sign in
        </h1>
        <p className="sub text-[14px] leading-[1.5] text-[var(--text-2)] mb-[30px]">
          Continue with your Google Account to start chatting.
        </p>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          className="g-btn"
          aria-label="Continue with Google"
        >
          {loading ? (
            <div className="g-spinner" />
          ) : (
            <svg
              className="w-[18px] h-[18px] shrink-0"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.6151z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2582c-.8064.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5827-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.9641 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z"
              />
              <path
                fill="#EA4335"
                d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1618 6.6564 3.5795 9 3.5795z"
              />
            </svg>
          )}
          <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        <footer className="mt-[26px] text-center text-[12px] text-[var(--text-2)]">
          <a
            href="https://wa.me/917991959886"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-2)] hover:text-[var(--text-1)] no-underline border-b border-[var(--border)] pb-[1px] transition-colors"
          >
            Contact
          </a>
          <span className="mx-2 opacity-60">·</span>
          <span>Privacy</span>
          <p className="credit text-[11px] tracking-[0.2px] text-[var(--text-2)] opacity-85 mt-[6px]">
            Developed by gxnikhil
          </p>
        </footer>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="login-body relative min-h-dvh flex items-center justify-center p-6 overflow-hidden">
      <div className="glow" />
      <div className="wrap w-full max-w-[400px] relative z-10">
        <Suspense
          fallback={
            <div className="login-card p-10 text-center">
              <div className="g-spinner mx-auto" />
            </div>
          }
        >
          <LoginContent />
        </Suspense>
      </div>
    </main>
  )
}
