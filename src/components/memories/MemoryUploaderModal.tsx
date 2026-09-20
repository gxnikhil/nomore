'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { X, UploadCloud, Calendar, Sparkles, Image as ImageIcon, Film } from 'lucide-react'
import { validateMediaFile, formatFileSize, getMediaType } from '@/lib/utils'

interface MemoryUploaderModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, caption?: string, memoryDate?: string) => Promise<boolean>
  uploading: boolean
}

export default function MemoryUploaderModal({
  isOpen,
  onClose,
  onUpload,
  uploading,
}: MemoryUploaderModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReset()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Object URL cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!isOpen) return null

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file.')
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setCaption('')
    setErrorMsg(null)
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    const success = await onUpload(selectedFile, caption, memoryDate)
    if (success) {
      handleReset()
      onClose()
    }
  }

  const mediaType = selectedFile ? getMediaType(selectedFile.type) : 'image'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-card rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="font-display font-bold text-lg text-[var(--color-text-primary)]">
              Add Memory to Timeline
            </h2>
          </div>
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            className="p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border-light)] hover:border-[var(--color-accent)] rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--color-bg-secondary)]/50 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-3 text-purple-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
                Select Photo or Video Memory
              </p>
              <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
                Photos up to 10MB, Videos up to 50MB. Saved securely to your private couple timeline.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[250px] flex items-center justify-center border border-[var(--color-border)]">
                {mediaType === 'image' ? (
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={previewUrl!}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Memory Date Field */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Memory Date
                </label>
                <input
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Caption Field */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Caption / Journal Note
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a note about this moment..."
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedFile && (
          <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-bg-secondary)]">
            <button onClick={handleReset} disabled={uploading} className="btn-secondary text-xs py-2 px-4">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
            >
              {uploading ? 'Saving Memory...' : 'Save to Timeline'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
