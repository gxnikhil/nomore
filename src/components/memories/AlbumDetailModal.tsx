'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { SharedAlbum, AlbumMedia } from '@/lib/types'
import { X, Plus, Trash2, Images, Film, Image as ImageIcon, Download } from 'lucide-react'
import { triggerDownload } from '@/lib/utils'

interface AlbumDetailModalProps {
  isOpen: boolean
  album: SharedAlbum | null
  currentUserId: string
  onClose: () => void
  onFetchMedia: (albumId: string) => Promise<AlbumMedia[]>
  onAddMedia: (albumId: string, file: File, caption?: string) => Promise<boolean>
  onDeleteMedia: (mediaId: string, storagePath: string, albumId: string) => void
  onDeleteAlbum: (albumId: string) => void
}

export default function AlbumDetailModal({
  isOpen,
  album,
  currentUserId,
  onClose,
  onFetchMedia,
  onAddMedia,
  onDeleteMedia,
  onDeleteAlbum,
}: AlbumDetailModalProps) {
  const [mediaList, setMediaList] = useState<AlbumMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeMedia, setActiveMedia] = useState<AlbumMedia | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && album) {
      setLoading(true)
      onFetchMedia(album.id).then((items) => {
        setMediaList(items)
        setLoading(false)
      })
    }
  }, [isOpen, album, onFetchMedia])

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !album) return null

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const success = await onAddMedia(album.id, file)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (success) {
      const updated = await onFetchMedia(album.id)
      setMediaList(updated)
    }
  }

  const isCreator = album.created_by === currentUserId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-4xl h-full max-h-[85dvh] glass-card rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl flex flex-col justify-between">
        {/* Top Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--color-text-primary)] flex items-center gap-2">
              <Images className="w-5 h-5 text-purple-400" />
              {album.title}
            </h2>
            {album.description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{album.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Add Photos/Videos'}</span>
            </button>

            {isCreator && (
              <button
                onClick={() => {
                  onDeleteAlbum(album.id)
                  onClose()
                }}
                className="p-2 rounded-xl bg-red-950/40 text-red-300 hover:bg-red-900/60"
                title="Delete album"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Album Media Grid */}
        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square skeleton rounded-xl" />
              ))}
            </div>
          ) : mediaList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mediaList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveMedia(item)}
                  className="aspect-square rounded-xl overflow-hidden bg-black border border-[var(--color-border)] relative group cursor-pointer"
                >
                  {item.media_url ? (
                    item.media_type === 'image' ? (
                      <img
                        src={item.media_url}
                        alt={item.caption || 'Album Media'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <video src={item.media_url} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                      Loading...
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-start justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (item.media_url) triggerDownload(item.media_url, item.file_name || 'album_media')
                      }}
                      className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {item.uploaded_by === currentUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteMedia(item.id, item.storage_path, album.id)
                          setMediaList((prev) => prev.filter((m) => m.id !== item.id))
                        }}
                        className="p-1.5 rounded-full bg-red-950/80 text-red-300 hover:bg-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[var(--color-text-muted)] space-y-2">
              <Images className="w-8 h-8 text-purple-400/40 mx-auto" />
              <p>This shared album is empty. Add photos or videos above!</p>
            </div>
          )}
        </div>

        {/* Fullscreen Media Viewer for selected album item */}
        {activeMedia && activeMedia.media_url && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setActiveMedia(null)}
          >
            <div className="relative max-w-4xl max-h-[90dvh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveMedia(null)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>
              {activeMedia.media_type === 'image' ? (
                <img
                  src={activeMedia.media_url}
                  alt="Full view"
                  className="max-w-full max-h-[85dvh] object-contain rounded-xl"
                />
              ) : (
                <video
                  src={activeMedia.media_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85dvh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
