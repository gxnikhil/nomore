'use client'

import { Story, Profile } from '@/lib/types'
import { Plus, Flame } from 'lucide-react'

interface StoryRingProps {
  currentUserId: string
  partnerProfile: Profile | null
  stories: Story[]
  onOpenUpload: () => void
  onOpenViewer: (initialIndex: number) => void
}

export default function StoryRing({
  currentUserId,
  partnerProfile,
  stories,
  onOpenUpload,
  onOpenViewer,
}: StoryRingProps) {
  const myStories = stories.filter((s) => s.user_id === currentUserId)
  const partnerStories = stories.filter((s) => s.user_id !== currentUserId)

  const hasMyStories = myStories.length > 0
  const hasPartnerStories = partnerStories.length > 0

  const hasUnviewedPartnerStories = partnerStories.some(
    (s) => !s.views?.some((v) => v.viewer_id === currentUserId)
  )

  const partnerName = partnerProfile?.display_name || partnerProfile?.username || 'Partner'

  return (
    <div className="flex items-center gap-5 overflow-x-auto py-2 px-1 no-scrollbar">
      {/* 1. My Story Avatar / Add Story Trigger */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <button
          onClick={() => {
            if (hasMyStories) {
              const myFirstIdx = stories.findIndex((s) => s.user_id === currentUserId)
              onOpenViewer(myFirstIdx >= 0 ? myFirstIdx : 0)
            } else {
              onOpenUpload()
            }
          }}
          className="relative group transition-transform active:scale-95 focus:outline-none"
        >
          <div
            className={`w-16 h-16 rounded-full p-[2.5px] transition-all ${
              hasMyStories
                ? 'story-ring glow-accent'
                : 'border-2 border-dashed border-[var(--color-border-light)] hover:border-[var(--color-accent)]'
            }`}
          >
            <div className="w-full h-full rounded-full bg-[var(--color-bg-secondary)] overflow-hidden flex items-center justify-center font-bold text-sm text-[var(--color-accent)]">
              {hasMyStories && myStories[0]?.media_url ? (
                <img
                  src={myStories[0].media_url}
                  alt="My Story"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Flame className="w-6 h-6 text-[var(--color-accent)]" />
              )}
            </div>
          </div>

          {/* Plus icon badge */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              onOpenUpload()
            }}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--color-accent)] text-slate-950 flex items-center justify-center border-2 border-[var(--color-bg-primary)] shadow-md hover:scale-110 transition-transform"
            title="Add Story"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </button>

        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Your Story</span>
      </div>

      {/* 2. Partner's Story Ring */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <button
          onClick={() => {
            if (hasPartnerStories) {
              const partnerFirstIdx = stories.findIndex((s) => s.user_id !== currentUserId)
              onOpenViewer(partnerFirstIdx >= 0 ? partnerFirstIdx : 0)
            } else {
              // Option to prompt or view
            }
          }}
          disabled={!hasPartnerStories}
          className={`relative group transition-transform focus:outline-none ${
            hasPartnerStories ? 'active:scale-95 cursor-pointer' : 'opacity-60 cursor-default'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full p-[2.5px] transition-all ${
              hasPartnerStories
                ? hasUnviewedPartnerStories
                  ? 'story-ring glow-accent'
                  : 'story-ring-viewed'
                : 'border-2 border-[var(--color-border)]'
            }`}
          >
            <div className="w-full h-full rounded-full bg-[var(--color-bg-secondary)] overflow-hidden flex items-center justify-center font-bold text-sm text-[var(--color-accent)]">
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
          </div>
        </button>

        <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
          {partnerName}
          {hasUnviewedPartnerStories && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] inline-block" />
          )}
        </span>
      </div>
    </div>
  )
}
