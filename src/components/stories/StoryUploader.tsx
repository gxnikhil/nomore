'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { X, UploadCloud, Film, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react'
import { validateMediaFile, formatFileSize, getMediaType } from '@/lib/utils'

interface StoryUploaderProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, caption?: string) => Promise<boolean>
  uploading: boolean
  uploadProgress: number
}

export default function StoryUploader({
  isOpen,
  onClose,
  onUpload,
  uploading,
  uploadProgress,
}: StoryUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
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
      setErrorMsg(validation.error || 'Invalid file selected.')
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
    const success = await onUpload(selectedFile, caption)
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
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="font-display font-bold text-lg text-[var(--color-text-primary)]">
              Create 24h Story
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

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!selectedFile ? (
            /* File Selector Area */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border-light)] hover:border-[var(--color-accent)] rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--color-bg-secondary)]/50 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-3 text-[var(--color-accent)] group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
                Choose photo or video
              </p>
              <p className="text-xs text-[var(--color-text-muted)] max-w-xs">
                Photos up to 10MB, Videos up to 50MB (MP4, WEBM). Story expires in 24 hours.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            /* Preview Area */
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] max-h-[350px] flex items-center justify-center border border-[var(--color-border)]">
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
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                  title="Change file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Story Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={200}
                  className="input-field"
                />
              </div>

              {/* File details badge */}
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                  {mediaType === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                  {selectedFile.name}
                </span>
                <span>{formatFileSize(selectedFile.size)}</span>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[var(--color-accent-light)]">
                <span>Uploading story...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {selectedFile && (
          <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-bg-secondary)]">
            <button
              onClick={handleReset}
              disabled={uploading}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>Post Story</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
