'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedMediaUrl, uploadPrivateFile, deletePrivateFile } from '@/lib/supabase/storage'
import { Profile } from '@/lib/types'
import { BUCKETS, MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

export function useProfile(currentUserId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const fetchProfiles = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data: rawProfiles, error: dbErr } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .eq('id', currentUserId)

      if (dbErr) throw dbErr

      if (!rawProfiles || rawProfiles.length === 0) return

      const myProfRaw = rawProfiles[0]

      // Resolve signed URL for my avatar
      let myAvatarSignedUrl = undefined
      if (myProfRaw?.avatar_url) {
        myAvatarSignedUrl =
          (await getSignedMediaUrl(BUCKETS.AVATARS, myProfRaw.avatar_url)) || undefined
      }

      setProfile(
        myProfRaw
          ? ({
              ...myProfRaw,
              avatar_url: myAvatarSignedUrl || myProfRaw.avatar_url,
            } as Profile)
          : null
      )
      setPartnerProfile(null)
    } catch (err: any) {
      console.error('Error fetching profiles:', err)
      toast.error('Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // Update profile fields
  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!currentUserId) return false

    try {
      setSaving(true)
      const supabase = createClient()

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name?.trim() || null,
          bio: updates.bio?.trim() || null,
          birthday: updates.birthday || null,
          relationship_info: updates.relationship_info?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUserId)

      if (dbErr) throw dbErr

      toast.success('Profile updated!')
      await fetchProfiles()
      return true
    } catch (err: any) {
      console.error('Error updating profile:', err)
      toast.error(err?.message || 'Failed to update profile.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Upload or update avatar
  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (!currentUserId) return false

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Avatar must be an image (JPEG, PNG, WEBP, GIF).')
      return false
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Avatar image must be smaller than 5MB.')
      return false
    }

    try {
      setAvatarUploading(true)
      const supabase = createClient()

      const ext = file.name.split('.').pop() || 'jpg'
      const storagePath = `${currentUserId}/avatar_${Date.now()}.${ext}`

      // Clean up previous avatar if exists
      if (profile?.avatar_url && profile.avatar_url.startsWith(`${currentUserId}/`)) {
        await deletePrivateFile(BUCKETS.AVATARS, profile.avatar_url)
      }

      // Upload file to private avatars bucket
      const { error: uploadErr } = await uploadPrivateFile(BUCKETS.AVATARS, storagePath, file)
      if (uploadErr) throw uploadErr

      // Update DB record
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: storagePath, updated_at: new Date().toISOString() })
        .eq('id', currentUserId)

      if (dbErr) throw dbErr

      toast.success('Avatar updated!')
      await fetchProfiles()
      return true
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      toast.error(err?.message || 'Failed to upload avatar.')
      return false
    } finally {
      setAvatarUploading(false)
    }
  }

  return {
    profile,
    partnerProfile,
    loading,
    saving,
    avatarUploading,
    fetchProfiles,
    updateProfile,
    uploadAvatar,
  }
}
