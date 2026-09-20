'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { X, FolderPlus, UploadCloud, ImageIcon } from 'lucide-react'

interface AlbumModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string, description?: string, coverFile?: File) => Promise<boolean>
  creating: boolean
}

export default function AlbumModal({
  isOpen,
  onClose,
  onCreate,
  creating,
}: AlbumModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

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
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  if (!isOpen) return null

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleReset = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setTitle('')
    setDescription('')
    setCoverFile(null)
    setCoverPreview(null)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    const success = await onCreate(title, description, coverFile || undefined)
    if (success) {
      handleReset()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-card rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-purple-400" />
            <h2 className="font-display font-bold text-lg text-[var(--color-text-primary)]">
              Create Shared Album
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
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              Album Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Trip 2025"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Cover Image Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              Album Cover Image (Optional)
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />

            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden h-32 bg-black border border-[var(--color-border)]">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setCoverFile(null)
                    setCoverPreview(null)
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-24 rounded-xl border border-dashed border-[var(--color-border-light)] hover:border-[var(--color-accent)] bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center text-xs text-[var(--color-text-muted)] gap-1 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <span>Choose Cover Image</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-bg-secondary)]">
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            disabled={creating}
            className="btn-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || creating}
            className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
          >
            {creating ? 'Creating Album...' : 'Create Album'}
          </button>
        </div>
      </div>
    </div>
  )
}
