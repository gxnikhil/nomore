'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useDashboard } from '@/hooks/useDashboard'
import {
  User,
  Settings,
  Camera,
  Calendar,
  Heart,
  ShieldCheck,
  Edit3,
  X,
  Check,
  Mail,
  Sparkles,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function ProfilePage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''

  const {
    profile,
    partnerProfile,
    loading,
    saving,
    avatarUploading,
    updateProfile,
    uploadAvatar,
  } = useProfile(currentUserId)

  // Edit profile form state
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [birthday, setBirthday] = useState('')
  const [relationshipInfo, setRelationshipInfo] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = () => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setBio(profile.bio || '')
    setBirthday(profile.birthday || '')
    setRelationshipInfo(profile.relationship_info || '')
    setIsEditing(true)
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    const success = await updateProfile({
      display_name: displayName,
      bio,
      birthday,
      relationship_info: relationshipInfo,
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
  const partnerName = partnerProfile?.display_name || partnerProfile?.username || 'Partner'

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <User className="w-7 h-7 text-[var(--color-accent)]" />
            Private Profile & Space
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Manage your personal profile and relationship details.
          </p>
        </div>

        <Link href="/settings" className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </div>

      {/* 2. Privacy Banner */}
      <div className="glass-card p-4 rounded-2xl border border-emerald-800/30 bg-emerald-950/20 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-200">
          This profile is strictly private. There are no public URLs, username searches, or external followers.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 skeleton rounded-2xl" />
          <div className="h-48 skeleton rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3. My Profile Card */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[var(--color-border)] relative space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
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
                  <div className="w-20 h-20 rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-accent)] overflow-hidden flex items-center justify-center text-2xl font-bold text-[var(--color-accent)] shadow-xl">
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

                  {/* Avatar Upload Camera Overlay */}
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
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--color-text-primary)]">
                    {myName}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    {profile?.email || 'Authorized Account'}
                  </p>
                </div>
              </div>

              {/* Edit Trigger Button */}
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="btn-secondary flex items-center gap-2 text-xs py-2 px-4 rounded-xl"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {/* Profile Fields or Edit Form */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
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
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Bio / Personal Note
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Add a bio or personal note for your partner..."
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Birthday
                    </label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                      Relationship / Anniversary Info
                    </label>
                    <input
                      type="text"
                      value={relationshipInfo}
                      onChange={(e) => setRelationshipInfo(e.target.value)}
                      placeholder="e.g. Together since Oct 12"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium block">Bio</span>
                  <p className="text-xs text-[var(--color-text-primary)]">
                    {profile?.bio || 'No bio added yet.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium block">Birthday</span>
                  <p className="text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {profile?.birthday ? formatDate(profile.birthday) : 'Not set'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1 sm:col-span-2">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium block">
                    Relationship Details
                  </span>
                  <p className="text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[var(--color-rose)]" />
                    {profile?.relationship_info || 'Couple space active.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. Partner Profile Card */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
            <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Partner Profile</span>
            </h3>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="w-14 h-14 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-light)] overflow-hidden flex items-center justify-center text-lg font-bold text-[var(--color-accent)]">
                {partnerProfile?.avatar_url ? (
                  <img
                    src={partnerProfile.avatar_url}
                    alt={partnerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{partnerName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-base text-[var(--color-text-primary)]">
                  {partnerName}
                </h4>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {partnerProfile?.email || 'Authorized Couple Member'}
                </p>
                {partnerProfile?.birthday && (
                  <span className="text-[11px] text-[var(--color-accent-light)] flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Birthday: {formatDate(partnerProfile.birthday)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
