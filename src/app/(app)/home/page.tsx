'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/hooks/useDashboard'
import { useStories } from '@/hooks/useStories'
import StoryRing from '@/components/stories/StoryRing'
import StoryUploader from '@/components/stories/StoryUploader'
import StoryViewer from '@/components/stories/StoryViewer'
import {
  Sparkles,
  Flame,
  Images,
  MessageCircle,
  Plus,
  Calendar,
  Heart,
  ChevronRight,
  ShieldCheck,
  FolderHeart,
} from 'lucide-react'

export default function HomePage() {
  // 1. Fetch dashboard data (profiles, memories, albums, latest message, countdowns)
  const { data: dash, loading: dashLoading } = useDashboard('me') // UserId resolved via client session inside hooks
  // Resolve user id from session
  const currentUserId = dash.myProfile?.id || ''

  // 2. Fetch active stories
  const {
    stories,
    loading: storiesLoading,
    uploading,
    uploadProgress,
    uploadStory,
    markAsViewed,
    reactToStory,
    deleteStory,
  } = useStories(currentUserId)

  // 3. UI states for modals
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerInitialIdx, setViewerInitialIdx] = useState(0)

  const partnerName = dash.partnerProfile?.display_name || dash.partnerProfile?.username || 'Partner'

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* 1. Couple Dashboard Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-[var(--color-border)]">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[var(--color-accent-glow)] via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] text-xs font-semibold border border-[var(--color-accent)]/30">
              <Sparkles className="w-3.5 h-3.5" />
              Private 2-Person Haven
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Welcome back to our space
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm max-w-lg">
              Every story, memory, and chat shared here stays strictly between you and {partnerName}.
            </p>
          </div>

          {/* Partner Birthday Countdown Badge */}
          {dash.partnerBirthdayCountdown && (
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]/70">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 p-[1px] shrink-0">
                <div className="w-full h-full bg-[var(--color-bg-primary)] rounded-[11px] flex items-center justify-center text-rose-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                  {partnerName}'s Birthday
                </span>
                <span className="text-sm font-bold text-[var(--color-accent-light)]">
                  {dash.partnerBirthdayCountdown.days === 0
                    ? '🎉 Today!'
                    : `In ${dash.partnerBirthdayCountdown.days} days (${dash.partnerBirthdayCountdown.dateStr})`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Stories Bar */}
      <div className="glass-card p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="font-display font-semibold text-base text-[var(--color-text-primary)]">
              Ephemeral Stories
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              24 Hours
            </span>
          </div>

          <button
            onClick={() => setIsUploaderOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-xl shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Story</span>
          </button>
        </div>

        {/* Story Ring Component */}
        <StoryRing
          currentUserId={currentUserId}
          partnerProfile={dash.partnerProfile}
          stories={stories}
          onOpenUpload={() => setIsUploaderOpen(true)}
          onOpenViewer={(idx) => {
            setViewerInitialIdx(idx)
            setIsViewerOpen(true)
          }}
        />
      </div>

      {/* 3. Grid Section: Chat Preview & Shared Albums */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Latest Chat Snippet Card */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
              <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)]">
                Private Chat
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40">
              <ShieldCheck className="w-3 h-3" />
              E2EE Active
            </span>
          </div>

          {dash.latestMessage ? (
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {dash.latestMessage.sender?.display_name || 'Message'}
                </span>
                <span>
                  {new Date(dash.latestMessage.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 italic">
                "{dash.latestMessage.encrypted_content ? 'Encrypted message' : 'Media attachment'}"
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
              No recent messages yet. Start your conversation!
            </div>
          )}

          <Link
            href="/chat"
            className="btn-secondary flex items-center justify-center gap-2 text-xs py-2.5 w-full rounded-xl"
          >
            <span>Open Private Chat</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Shared Albums Preview */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderHeart className="w-5 h-5 text-purple-400" />
              <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)]">
                Shared Albums
              </h3>
            </div>
            <Link
              href="/memories"
              className="text-xs text-[var(--color-accent-light)] hover:underline flex items-center gap-0.5"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {dash.recentAlbums.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {dash.recentAlbums.slice(0, 2).map((album) => (
                <div
                  key={album.id}
                  className="rounded-xl overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-2 space-y-2"
                >
                  <div className="w-full aspect-video rounded-lg bg-[var(--color-bg-elevated)] overflow-hidden flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Images className="w-6 h-6 text-purple-400/50" />
                    )}
                  </div>
                  <span className="font-semibold text-xs text-[var(--color-text-primary)] truncate block">
                    {album.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
              No shared albums created yet.
            </div>
          )}

          <Link
            href="/memories"
            className="btn-secondary flex items-center justify-center gap-2 text-xs py-2.5 w-full rounded-xl"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Create Shared Album</span>
          </Link>
        </div>
      </div>

      {/* 4. Recent Memories Highlights Grid */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-rose-400" />
            <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)]">
              Recent Memories
            </h3>
          </div>
          <Link
            href="/memories"
            className="text-xs text-[var(--color-accent-light)] hover:underline flex items-center gap-0.5"
          >
            <span>Timeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {dashLoading ? (
          /* Skeleton Loader */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square skeleton rounded-xl" />
            ))}
          </div>
        ) : dash.recentMemories.length > 0 ? (
          /* Real Memories Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dash.recentMemories.map((mem) => (
              <div
                key={mem.id}
                className="aspect-square rounded-xl overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border)] relative group"
              >
                {mem.media_url ? (
                  mem.media_type === 'image' ? (
                    <img
                      src={mem.media_url}
                      alt={mem.caption || 'Memory'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={mem.media_url}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                    Media
                  </div>
                )}
                {mem.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] text-white truncate">
                    {mem.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 text-center rounded-xl bg-[var(--color-bg-secondary)]/40 border border-[var(--color-border)] space-y-2">
            <Heart className="w-8 h-8 text-[var(--color-rose)]/40 mx-auto" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No saved memories yet. Photos uploaded to albums or timeline will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Story Upload Modal */}
      <StoryUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onUpload={uploadStory}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        isOpen={isViewerOpen}
        initialIndex={viewerInitialIdx}
        stories={stories}
        currentUserId={currentUserId}
        partnerProfile={dash.partnerProfile}
        onClose={() => setIsViewerOpen(false)}
        onMarkAsViewed={markAsViewed}
        onReact={reactToStory}
        onDelete={deleteStory}
      />
    </div>
  )
}
