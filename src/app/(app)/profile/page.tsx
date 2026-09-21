'use client'

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useDashboard } from '@/hooks/useDashboard'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Settings,
  Camera,
  AtSign,
  Edit3,
  Check,
  Mail,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''
  const [userEmail, setUserEmail] = useState<string>('Authenticated User')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email)
      }
    })
  }, [])

  const {
    profile,
    loading,
    saving,
    avatarUploading,
    updateProfile,
    uploadAvatar,
    changeUsername,
  } = useProfile(currentUserId)

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [bio, setBio] = useState('')
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = () => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setUsernameInput(profile.username || '')
    setBio(profile.bio || '')
    setIsAvailable(null)
    setIsEditing(true)
  }

  const checkAvailability = async (val: string) => {
    const clean = val.trim().replace(/^@/, '').toLowerCase()
    if (clean === (profile?.username || '')) {
      setIsAvailable(null)
      return
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setIsAvailable(false)
      return
    }

    try {
      setCheckingUsername(true)
      const supabase = createClient()
      const { data } = await supabase.rpc('check_username_available', {
        p_username: clean,
      })
      setIsAvailable(Boolean(data))
    } catch {
      setIsAvailable(false)
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsernameInput(clean)
    checkAvailability(clean)
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()

    // 1. Update Username if changed
    const cleanUser = usernameInput.trim().toLowerCase()
    if (cleanUser && cleanUser !== (profile?.username || '')) {
      const uSuccess = await changeUsername(cleanUser)
      if (!uSuccess) return
    }

    // 2. Update Display Name and Bio
    const success = await updateProfile({
      display_name: displayName,
      bio,
    })
    if (success) {
      setIsEditing(false)
    }
  }

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar(file)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const myName = profile?.display_name || profile?.username || 'You'

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12 text-black">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
            <User className="w-6 h-6 text-black" />
            <span>My Profile</span>
          </h1>
          <p className="text-xs text-[#555555]">
            Manage your public profile information on NOMORE.
          </p>
        </div>

        <Link href="/settings" className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </div>

      {loading ? (
        <div className="h-48 bg-[#f5f5f7] animate-pulse rounded-2xl" />
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e5e5e7] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e5e5e7] pb-6">
            {/* Avatar + Basic Info */}
            <div className="flex items-center gap-4">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-[#f5f5f7] border-2 border-black overflow-hidden flex items-center justify-center text-2xl font-bold text-black shadow-sm">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={myName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{myName.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  title="Change Avatar"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </button>
              </div>

              <div>
                <h2 className="font-bold text-xl sm:text-2xl text-black">
                  {myName}
                </h2>
                {profile?.username && (
                  <p className="text-xs text-[#555555] font-semibold flex items-center gap-0.5 mt-0.5">
                    <AtSign className="w-3.5 h-3.5 text-[#86868b]" />
                    <span>{profile.username}</span>
                  </p>
                )}
                <p className="text-xs text-[#86868b] flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {userEmail}
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Profile Details or Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1">
                  Username Handle (@)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868b] text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="input-field pl-7 text-xs"
                    placeholder="username"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
                {checkingUsername ? (
                  <p className="text-[11px] text-[#86868b] mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
                  </p>
                ) : isAvailable === true ? (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Handle @{usernameInput} is available!
                  </p>
                ) : isAvailable === false ? (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">
                    Handle is unavailable or invalid (must be 3-20 a-z, 0-9, _).
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1">
                  Bio / Status
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell friends about yourself..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#e5e5e7]">
                <span className="text-xs text-[#86868b] font-medium block">Bio</span>
                <p className="text-xs text-black mt-0.5">
                  {profile?.bio || 'No bio added yet.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
