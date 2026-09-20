import { clsx, type ClassValue } from 'clsx'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_PHOTO_SIZE, MAX_VIDEO_SIZE } from './constants'

// Simple class name merge (no tailwind-merge needed for this project size)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType)
}

export function isVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType)
}

export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const isImage = isImageType(file.type)
  const isVideo = isVideoType(file.type)

  if (!isImage && !isVideo) {
    return { valid: false, error: 'Unsupported file type. Please upload an image or video.' }
  }

  if (isImage && file.size > MAX_PHOTO_SIZE) {
    return { valid: false, error: `Image must be under ${formatFileSize(MAX_PHOTO_SIZE)}.` }
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `Video must be under ${formatFileSize(MAX_VIDEO_SIZE)}.` }
  }

  return { valid: true }
}

export function getMediaType(mimeType: string): 'image' | 'video' {
  return isVideoType(mimeType) ? 'video' : 'image'
}

export function generateStoragePath(
  bucket: string,
  segments: string[],
  fileName: string
): string {
  const ext = fileName.split('.').pop() || ''
  const uniqueName = `${crypto.randomUUID()}.${ext}`
  return [...segments, uniqueName].join('/')
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function formatMessageTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function triggerDownload(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
