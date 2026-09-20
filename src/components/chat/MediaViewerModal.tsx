'use client'

import { useState, useEffect } from 'react'
import { X, Download, Film, Image as ImageIcon, HeartHandshake, ShieldCheck, Loader2 } from 'lucide-react'
import { triggerDownload } from '@/lib/utils'
import { copyChatMediaToMemories } from '@/lib/supabase/storage'
import { toast } from 'sonner'

interface MediaViewerModalProps {
  isOpen: boolean
  mediaUrl: string | null
  mediaType: 'image' | 'video'
  fileName: string | null
  storagePath?: string | null
  mimeType?: string | null
  fileSize?: number | null
  currentUserId?: string
  onClose: () => void
}

export default function MediaViewerModal({
  isOpen,
  mediaUrl,
  mediaType,
  fileName,
  storagePath,
  mimeType,
  fileSize,
  currentUserId,
  onClose,
}: MediaViewerModalProps) {
  const [savingToMemories, setSavingToMemories] = useState(false)

  // Listen for Escape key to close viewer
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !mediaUrl) return null

  const nameToSave = fileName || (mediaType === 'image' ? 'photo.jpg' : 'video.mp4')

  const handleDownload = () => {
    triggerDownload(mediaUrl, nameToSave)
    toast.success('File saved to device.')
  }

  const handleSaveToMemories = async () => {
    if (!storagePath || !currentUserId) {
      toast.error('Cannot save media: missing details.')
      return
    }

    try {
      setSavingToMemories(true)
      const res = await copyChatMediaToMemories(
        storagePath,
        mediaType,
        mimeType || null,
        fileName || null,
        fileSize || null,
        currentUserId
      )

      if (res.success) {
        toast.success('Saved to Memories timeline!')
      } else {
        toast.error(res.error || 'Failed to save to memories.')
      }
    } catch (err: any) {
      console.error('Error saving to memories:', err)
      toast.error('Could not save file to memories.')
    } finally {
      setSavingToMemories(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-full max-h-[85dvh] flex flex-col justify-between items-center select-none">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/90 text-xs font-semibold">
              {mediaType === 'image' ? (
                <ImageIcon className="w-4 h-4 text-[var(--color-accent)]" />
              ) : (
                <Film className="w-4 h-4 text-[var(--color-accent)]" />
              )}
              <span className="truncate max-w-xs">{nameToSave}</span>
            </div>
            {/* Wording accuracy for chat media security */}
            <span className="text-[10px] text-emerald-400/80 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              Private & Encrypted in Transit/Storage
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Save to Memories button */}
            {storagePath && currentUserId && (
              <button
                onClick={handleSaveToMemories}
                disabled={savingToMemories}
                className="p-2 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/30 transition-all flex items-center gap-1.5 text-xs font-semibold px-3.5 disabled:opacity-60"
                title="Save this file to shared Memories timeline"
              >
                {savingToMemories ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HeartHandshake className="w-3.5 h-3.5" />
                )}
                <span>{savingToMemories ? 'Saving...' : 'Save to Memories'}</span>
              </button>
            )}

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3.5"
              title="Save to device"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Display Container */}
        <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>
      </div>
    </div>
  )
}
