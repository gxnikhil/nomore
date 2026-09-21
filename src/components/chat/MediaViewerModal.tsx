'use client'

import { useEffect } from 'react'
import { X, Download, Film, Image as ImageIcon, ShieldCheck } from 'lucide-react'
import { triggerDownload } from '@/lib/utils'
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
  onClose,
}: MediaViewerModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl h-full max-h-[85dvh] flex flex-col justify-between items-center">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/90 text-xs font-semibold">
              {mediaType === 'image' ? (
                <ImageIcon className="w-4 h-4 text-white" />
              ) : (
                <Film className="w-4 h-4 text-white" />
              )}
              <span className="truncate max-w-xs">{nameToSave}</span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Private Storage
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3.5"
              title="Save to device"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>

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
