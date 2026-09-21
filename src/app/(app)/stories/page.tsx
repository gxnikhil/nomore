'use client'

import { useState } from 'react'
import { useStories } from '@/hooks/useStories'
import { useDashboard } from '@/hooks/useDashboard'
import StoryRing from '@/components/stories/StoryRing'
import StoryUploader from '@/components/stories/StoryUploader'
import StoryViewer from '@/components/stories/StoryViewer'
import { Flame, Plus, Play, Trash2, Eye, Clock, Sparkles } from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'

export default function StoriesPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''

  const {
    stories,
    loading,
    uploading,
    uploadProgress,
    uploadStory,
    sendStoryReply,
    markAsViewed,
    reactToStory,
    deleteStory,
    fetchStoryViewers,
  } = useStories(currentUserId)

  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerInitialIdx, setViewerInitialIdx] = useState(0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Flame className="w-7 h-7 text-amber-500" />
            24h Ephemeral Stories
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Short-lived photo and video moments shared exclusively between you and {dash.partnerProfile?.display_name || 'Partner'}.
          </p>
        </div>

        <button
          onClick={() => setIsUploaderOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Story</span>
        </button>
      </div>

      {/* Story Ring Section */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--color-border)] space-y-4">
        <h2 className="font-display font-semibold text-sm text-[var(--color-text-secondary)] uppercase tracking-wider">
          Active Story Ring
        </h2>
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

      {/* Active Stories Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
            Active Stories ({stories.length})
          </h2>
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Auto-expires after 24h
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] skeleton rounded-2xl" />
            ))}
          </div>
        ) : stories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stories.map((story, idx) => {
              const isOwner = story.user_id === currentUserId
              const authorName = isOwner ? 'You' : story.profile?.display_name || 'Partner'

              return (
                <div
                  key={story.id}
                  onClick={() => {
                    setViewerInitialIdx(idx)
                    setIsViewerOpen(true)
                  }}
                  className="aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-[var(--color-border)] relative group cursor-pointer shadow-lg hover:border-[var(--color-accent)] transition-all"
                >
                  {story.media_url ? (
                    story.media_type === 'image' ? (
                      <img
                        src={story.media_url}
                        alt={story.caption || 'Story'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                      Loading media...
                    </div>
                  )}

                  {/* Gradient Overlay & Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 p-3 flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate drop-shadow">
                        {authorName}
                      </span>
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteStory(story.id, story.storage_path)
                          }}
                          className="p-1.5 rounded-full bg-red-950/80 text-red-300 hover:bg-red-900 transition-colors"
                          title="Delete story"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="space-y-1">
                      {story.caption && (
                        <p className="text-xs text-white/90 line-clamp-2 drop-shadow font-medium">
                          {story.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-white/20">
                        <span>{getRelativeTime(story.created_at)}</span>
                        {isOwner && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-[var(--color-accent)]" />
                            {story.views?.length || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3 border border-[var(--color-border)]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-8 h-8" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
              No active stories
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-sm">
              Post a photo or short video story. It will remain visible for 24 hours.
            </p>
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              Post a Story Now
            </button>
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
        onSendReply={sendStoryReply}
        onFetchViewers={fetchStoryViewers}
      />
    </div>
  )
}
