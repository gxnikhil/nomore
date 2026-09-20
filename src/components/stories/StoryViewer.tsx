'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Story, Profile } from '@/lib/types'
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Heart, Pause, Play } from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'
import { QUICK_REACTIONS } from '@/lib/constants'

interface StoryViewerProps {
  isOpen: boolean
  initialIndex: number
  stories: Story[]
  currentUserId: string
  partnerProfile: Profile | null
  onClose: () => void
  onMarkAsViewed: (storyId: string) => void
  onReact: (storyId: string, emoji: string) => void
  onDelete: (storyId: string, storagePath: string) => void
}

const STORY_PHOTO_DURATION_MS = 5000 // 5 seconds per photo

export default function StoryViewer({
  isOpen,
  initialIndex,
  stories,
  currentUserId,
  partnerProfile,
  onClose,
  onMarkAsViewed,
  onReact,
  onDelete,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentStory = stories[currentIndex]
  const isOwner = currentStory?.user_id === currentUserId
  const authorName = isOwner
    ? 'You'
    : currentStory?.profile?.display_name || partnerProfile?.display_name || 'Partner'

  // Synchronize index when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setProgress(0)
    }
  }, [isOpen, initialIndex])

  // Mark current story as viewed
  useEffect(() => {
    if (isOpen && currentStory) {
      onMarkAsViewed(currentStory.id)
    }
  }, [isOpen, currentIndex, currentStory, onMarkAsViewed])

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    }
  }, [currentIndex])

  // Keyboard event listener for story navigation and Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleNext, handlePrev])

  // Photo Story Auto-advance Timer
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return
    if (currentStory.media_type === 'video') return // Handled by video events

    const interval = 50 // Update progress every 50ms
    const step = (interval / STORY_PHOTO_DURATION_MS) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isOpen, currentIndex, currentStory, isPaused, handleNext])

  if (!isOpen || !currentStory) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg select-none">
      {/* Container wrapper */}
      <div
        className="relative w-full max-w-md h-full sm:h-[90dvh] sm:max-h-[800px] sm:rounded-2xl overflow-hidden bg-slate-950 flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Header: Progress Bars & User Profile */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-3">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((story, i) => {
              let fillWidth = '0%'
              if (i < currentIndex) fillWidth = '100%'
              else if (i === currentIndex) fillWidth = `${progress}%`

              return (
                <div
                  key={story.id}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{ width: fillWidth }}
                  />
                </div>
              )
            })}
          </div>

          {/* User Info Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                {currentStory.profile?.avatar_url ? (
                  <img
                    src={currentStory.profile.avatar_url}
                    alt={authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{authorName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">
                  {authorName}
                </span>
                <span className="text-[10px] text-white/70">
                  {getRelativeTime(currentStory.created_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Owner actions (Delete) */}
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(currentStory.id, currentStory.storage_path)
                    handleNext()
                  }}
                  className="p-2 rounded-full bg-red-950/60 text-red-300 hover:bg-red-900/80 transition-colors"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Display Area */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const p = (videoRef.current.currentTime / videoRef.current.duration) * 100
                  setProgress(isNaN(p) ? 0 : p)
                }
              }}
              onEnded={handleNext}
            />
          )}

          {/* Left / Right Tap Targets for Navigation */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            disabled={currentIndex === 0}
            className="absolute left-0 top-16 bottom-20 w-1/3 z-10 opacity-0 hover:opacity-10 flex items-center justify-start pl-4"
          >
            <ChevronLeft className="w-8 h-8 text-white drop-shadow" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-0 top-16 bottom-20 w-1/3 z-10 opacity-0 hover:opacity-10 flex items-center justify-end pr-4"
          >
            <ChevronRight className="w-8 h-8 text-white drop-shadow" />
          </button>
        </div>

        {/* Bottom Bar: Caption, Reactions, Views */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-3">
          {/* Story Caption */}
          {currentStory.caption && (
            <p className="text-sm font-medium text-white/90 text-center px-4 py-1 bg-black/40 backdrop-blur-sm rounded-xl max-w-xs mx-auto">
              {currentStory.caption}
            </p>
          )}

          {/* View stats for owner */}
          {isOwner && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/70">
              <Eye className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {currentStory.views?.length || 0}{' '}
                {currentStory.views?.length === 1 ? 'view' : 'views'}
              </span>
            </div>
          )}

          {/* Reactions bar for Partner's story */}
          {!isOwner && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReact(currentStory.id, emoji)
                  }}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 hover:scale-125 transition-all text-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
