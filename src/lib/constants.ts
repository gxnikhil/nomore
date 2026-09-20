// ============================================================================
// NOMORE: Constants
// ============================================================================

export const APP_NAME = 'NOMORE'
export const APP_TAGLINE = 'Our little space.'

// Media limits (in bytes)
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50 MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

// Story duration
export const STORY_DURATION_HOURS = 24

// Signed URL expiry (seconds)
export const SIGNED_URL_EXPIRY = 60 // 60 seconds

// Chat pagination
export const MESSAGES_PER_PAGE = 30

// Memories pagination
export const MEMORIES_PER_PAGE = 20

// Emoji reactions
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏']

// Routes
export const ROUTES = {
  HOME: '/home',
  CHAT: '/chat',
  MEMORIES: '/memories',
  ALBUMS: '/albums',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  STORIES: '/stories',
  LOGIN: '/login',
  ACCESS_DENIED: '/access-denied',
} as const

// Storage buckets
export const BUCKETS = {
  AVATARS: 'avatars',
  STORIES: 'stories',
  MESSAGES: 'messages',
  ALBUMS: 'albums',
  MEMORIES: 'memories',
} as const
