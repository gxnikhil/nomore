'use client'

import { useState } from 'react'
import { useMemories } from '@/hooks/useMemories'
import { useAlbums } from '@/hooks/useAlbums'
import { useDashboard } from '@/hooks/useDashboard'
import MemoryUploaderModal from '@/components/memories/MemoryUploaderModal'
import AlbumModal from '@/components/memories/AlbumModal'
import AlbumDetailModal from '@/components/memories/AlbumDetailModal'
import OnThisDaySection from '@/components/memories/OnThisDaySection'
import {
  Images,
  Plus,
  Heart,
  FolderPlus,
  Filter,
  Film,
  Image as ImageIcon,
  Trash2,
  Download,
  X,
  Sparkles,
} from 'lucide-react'
import { SavedMedia, SharedAlbum } from '@/lib/types'
import { formatDate, triggerDownload } from '@/lib/utils'

export default function MemoriesPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''

  // Memories hook
  const {
    memories,
    onThisDayMemories,
    loading: memoriesLoading,
    uploading: memoryUploading,
    filterType,
    setFilterType,
    uploadMemory,
    toggleFavorite,
    deleteMemory,
  } = useMemories(currentUserId)

  // Albums hook
  const {
    albums,
    loading: albumsLoading,
    creating: albumCreating,
    createAlbum,
    fetchAlbumMedia,
    addMediaToAlbum,
    deleteAlbumMedia,
    deleteAlbum,
  } = useAlbums(currentUserId)

  // UI States
  const [activeTab, setActiveTab] = useState<'timeline' | 'albums'>('timeline')
  const [isMemoryUploaderOpen, setIsMemoryUploaderOpen] = useState(false)
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<SharedAlbum | null>(null)
  const [activeMediaItem, setActiveMediaItem] = useState<SavedMedia | null>(null)

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Images className="w-7 h-7 text-purple-400" />
            Our Private Memories & Scrapbook
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Chronological archive of photos, videos, and shared albums.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAlbumModalOpen(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-4"
          >
            <FolderPlus className="w-4 h-4 text-purple-400" />
            <span>New Album</span>
          </button>

          <button
            onClick={() => setIsMemoryUploaderOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-4 shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      {/* 2. On This Day Section */}
      {onThisDayMemories.length > 0 && (
        <OnThisDaySection
          memories={onThisDayMemories}
          onOpenMedia={(mem) => setActiveMediaItem(mem)}
        />
      )}

      {/* 3. Navigation Tabs & Filter Bar */}
      <div className="glass-card p-2 rounded-2xl border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-[var(--color-accent)] text-slate-950 shadow-md'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Memories Timeline
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'albums'
                ? 'bg-[var(--color-accent)] text-slate-950 shadow-md'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Shared Albums ({albums.length})
          </button>
        </div>

        {/* Timeline Filters */}
        {activeTab === 'timeline' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[var(--color-text-muted)] mr-1 hidden sm:inline flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            {(['all', 'image', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                  filterType === type
                    ? 'bg-[var(--color-bg-hover)] text-[var(--color-accent-light)] border border-[var(--color-border-light)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tab 1: Chronological Memories Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {memoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square skeleton rounded-2xl" />
              ))}
            </div>
          ) : memories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {memories.map((mem) => {
                const isOwner = mem.uploaded_by === currentUserId

                return (
                  <div
                    key={mem.id}
                    onClick={() => setActiveMediaItem(mem)}
                    className="aspect-square rounded-2xl overflow-hidden bg-black border border-[var(--color-border)] relative group cursor-pointer shadow-lg hover:border-[var(--color-accent)] transition-all"
                  >
                    {mem.media_url ? (
                      mem.media_type === 'image' ? (
                        <img
                          src={mem.media_url}
                          alt={mem.caption || 'Memory'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <video src={mem.media_url} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                        Loading...
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between opacity-90 group-hover:opacity-100 transition-opacity">
                      {/* Top Header: Favorite Heart */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(mem.id, mem.is_favorite)
                          }}
                          className={`p-1.5 rounded-full transition-transform active:scale-125 ${
                            mem.is_favorite
                              ? 'bg-rose-500/80 text-white'
                              : 'bg-black/50 text-white/70 hover:text-rose-400'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              mem.is_favorite ? 'fill-white' : ''
                            }`}
                          />
                        </button>

                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteMemory(mem.id, mem.storage_path)
                            }}
                            className="p-1.5 rounded-full bg-red-950/80 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Footer: Date & Caption */}
                      <div>
                        {mem.caption && (
                          <p className="text-xs text-white/90 font-medium line-clamp-1 drop-shadow mb-1">
                            {mem.caption}
                          </p>
                        )}
                        <span className="text-[10px] text-amber-200/80 block font-semibold">
                          {mem.memory_date
                            ? formatDate(mem.memory_date)
                            : formatDate(mem.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3 border border-[var(--color-border)]">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Images className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
                Your scrapbook is empty
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-sm">
                Save photos/videos from chat or upload moments directly to build your private couple timeline.
              </p>
              <button
                onClick={() => setIsMemoryUploaderOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 mt-2"
              >
                <Plus className="w-4 h-4" />
                Add First Memory
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Shared Albums Grid */}
      {activeTab === 'albums' && (
        <div className="space-y-4">
          {albumsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 skeleton rounded-2xl" />
              ))}
            </div>
          ) : albums.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="glass-card glass-card-hover p-4 rounded-2xl border border-[var(--color-border)] cursor-pointer group space-y-3 flex flex-col justify-between"
                >
                  <div className="w-full aspect-video rounded-xl bg-[var(--color-bg-secondary)] overflow-hidden border border-[var(--color-border)] relative flex items-center justify-center">
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Images className="w-10 h-10 text-purple-400/40" />
                    )}
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                      {album.media_count || 0} items
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-light)] transition-colors truncate">
                      {album.title}
                    </h3>
                    {album.description && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 mt-0.5">
                        {album.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3 border border-[var(--color-border)]">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
                No shared albums yet
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-sm">
                Create shared albums (e.g. Vacations, Anniversaries) to organize your media together.
              </p>
              <button
                onClick={() => setIsAlbumModalOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 mt-2"
              >
                <Plus className="w-4 h-4" />
                Create First Album
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <MemoryUploaderModal
        isOpen={isMemoryUploaderOpen}
        onClose={() => setIsMemoryUploaderOpen(false)}
        onUpload={uploadMemory}
        uploading={memoryUploading}
      />

      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        onCreate={createAlbum}
        creating={albumCreating}
      />

      <AlbumDetailModal
        isOpen={Boolean(selectedAlbum)}
        album={selectedAlbum}
        currentUserId={currentUserId}
        onClose={() => setSelectedAlbum(null)}
        onFetchMedia={fetchAlbumMedia}
        onAddMedia={addMediaToAlbum}
        onDeleteMedia={deleteAlbumMedia}
        onDeleteAlbum={deleteAlbum}
      />

      {/* Fullscreen Media Viewer for Timeline */}
      {activeMediaItem && activeMediaItem.media_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
          onClick={() => setActiveMediaItem(null)}
        >
          <div className="relative max-w-4xl max-h-[90dvh]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <button
                onClick={() =>
                  triggerDownload(activeMediaItem.media_url!, activeMediaItem.file_name || 'memory')
                }
                className="p-2 rounded-full bg-black/70 text-white hover:bg-black"
                title="Save to device"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveMediaItem(null)}
                className="p-2 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeMediaItem.media_type === 'image' ? (
              <img
                src={activeMediaItem.media_url}
                alt="Memory"
                className="max-w-full max-h-[85dvh] object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <video
                src={activeMediaItem.media_url}
                controls
                autoPlay
                className="max-w-full max-h-[85dvh] object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
