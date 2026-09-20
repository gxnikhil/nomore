'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AccessDeniedPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
    }
  }

  return (
    <main className="min-h-dvh gradient-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md glass-card p-8 sm:p-10 flex flex-col items-center text-center relative z-10 animate-fade-in border border-red-900/30 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/40 mb-6 flex items-center justify-center text-red-400 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
          Access Restricted
        </h1>

        <p className="text-[var(--color-text-secondary)] text-sm sm:text-base leading-relaxed mb-8">
          This private space is not available for this account.
        </p>

        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold rounded-xl transition-all hover:bg-[var(--color-bg-hover)]"
        >
          <LogOut className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span>{loading ? 'Signing out...' : 'Sign Out & Return'}</span>
        </button>
      </div>
    </main>
  )
}
