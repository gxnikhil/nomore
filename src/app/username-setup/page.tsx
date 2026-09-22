'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AtSign, Check, X, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Logo from '@/components/common/Logo'

export default function UsernameSetupPage() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      const defaultName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        ''
      setDisplayName(defaultName)

      // If user already has a username, redirect home
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile?.username) {
        router.push('/home')
      }
    }

    checkAuth()
  }, [router])

  // Real-time username validation & DB availability check
  useEffect(() => {
    const cleaned = username.toLowerCase().trim()

    if (!cleaned) {
      setIsAvailable(null)
      setErrorMsg(null)
      return
    }

    if (cleaned.length < 3 || cleaned.length > 20) {
      setIsAvailable(false)
      setErrorMsg('Username must be 3–20 characters')
      return
    }

    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      setIsAvailable(false)
      setErrorMsg('Only letters, numbers, and underscores allowed')
      return
    }

    setErrorMsg(null)
    setChecking(true)

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', cleaned)
          .maybeSingle()

        if (data && data.id !== userId) {
          setIsAvailable(false)
          setErrorMsg('Username is already taken')
        } else {
          setIsAvailable(true)
          setErrorMsg(null)
        }
      } catch (err) {
        console.error('Check username error:', err)
      } finally {
        setChecking(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username, userId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId || !isAvailable || submitting) return

    const cleanedUsername = username.toLowerCase().trim()

    try {
      setSubmitting(true)
      const supabase = createClient()

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          username: cleanedUsername,
          display_name: displayName.trim() || cleanedUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateErr) throw updateErr

      toast.success(`Welcome to NOMORE, @${cleanedUsername}!`)
      router.push('/home')
    } catch (err: any) {
      console.error('Username setup error:', err)
      toast.error(err?.message || 'Failed to save username.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-[#f5f5f7] text-black">
      <div className="w-full max-w-md bg-white border border-[#e5e5e7] rounded-3xl p-8 shadow-xl animate-fade-in">
        <div className="text-center space-y-2 mb-8">
          <Logo variant="icon" size={48} className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Choose your Username
          </h1>
          <p className="text-xs text-[#555555]">
            This is how friends can search and find you on NOMORE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name or display name"
              className="input-field"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] mb-1.5">
              Unique Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#86868b]">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="input-field pl-9 pr-10"
                maxLength={20}
                required
              />
              <div className="absolute right-3 flex items-center">
                {checking ? (
                  <Loader2 className="w-4 h-4 text-[#86868b] animate-spin" />
                ) : isAvailable === true ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                ) : isAvailable === false ? (
                  <X className="w-4 h-4 text-red-500 stroke-[3]" />
                ) : null}
              </div>
            </div>

            {errorMsg ? (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
                <span>{errorMsg}</span>
              </p>
            ) : isAvailable ? (
              <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">
                @{username.toLowerCase()} is available!
              </p>
            ) : (
              <p className="text-[11px] text-[#86868b] mt-1.5">
                3–20 characters (letters, numbers, underscore).
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isAvailable || submitting}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete Setup</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
