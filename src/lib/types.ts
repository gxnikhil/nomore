// ============================================================================
// NOMORE: TypeScript Types
// ============================================================================

export interface Profile {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  birthday: string | null
  relationship_info: string | null
  created_at: string
  updated_at: string
}

export interface PrivateSpace {
  id: string
  name: string
  created_at: string
}

export interface PrivateSpaceMember {
  id: string
  space_id: string
  auth_user_id: string
  role: string
  joined_at: string
}

export interface Story {
  id: string
  user_id: string
  space_id: string
  media_type: 'image' | 'video'
  storage_path: string
  caption: string | null
  duration_seconds: number | null
  expires_at: string
  created_at: string
  // Joined
  profile?: Profile
  views?: StoryView[]
  reactions?: StoryReaction[]
  media_url?: string
}

export interface StoryView {
  id: string
  story_id: string
  viewer_id: string
  viewed_at: string
}

export interface StoryReaction {
  id: string
  story_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface Conversation {
  id: string
  space_id: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  encrypted_content: string | null
  iv: string | null
  message_type: 'text' | 'media' | 'system' | 'reply'
  reply_to_id: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  // Client-side decrypted content
  decrypted_content?: string
  // Joined
  sender?: Profile
  media?: MessageMedia[]
  reactions?: MessageReaction[]
  reply_to?: Message
  read_status?: MessageReadStatus[]
}

export interface MessageMedia {
  id: string
  message_id: string
  storage_path: string
  media_type: 'image' | 'video'
  mime_type: string | null
  file_name: string | null
  file_size: number | null
  width: number | null
  height: number | null
  created_at: string
  // Client-side
  media_url?: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface MessageReadStatus {
  id: string
  message_id: string
  user_id: string
  read_at: string
}

export interface SharedAlbum {
  id: string
  space_id: string
  title: string
  description: string | null
  cover_storage_path: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  cover_url?: string
  media_count?: number
  creator?: Profile
}

export interface AlbumMedia {
  id: string
  album_id: string
  storage_path: string
  media_type: 'image' | 'video'
  mime_type: string | null
  caption: string | null
  file_name: string | null
  file_size: number | null
  uploaded_by: string
  taken_at: string | null
  created_at: string
  // Client-side
  media_url?: string
}

export interface SavedMedia {
  id: string
  space_id: string
  storage_path: string
  media_type: 'image' | 'video'
  mime_type: string | null
  caption: string | null
  file_name: string | null
  file_size: number | null
  uploaded_by: string
  memory_date: string | null
  is_favorite: boolean
  created_at: string
  // Client-side
  media_url?: string
  uploader?: Profile
}

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string | null
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
  // Joined
  sender?: Profile
}

export interface UserSettings {
  user_id: string
  theme: 'dark' | 'light'
  notification_prefs: {
    messages: boolean
    stories: boolean
    albums: boolean
    memories: boolean
  }
  updated_at: string
}

export interface EncryptionKey {
  user_id: string
  public_key_jwk: JsonWebKey
  created_at: string
  updated_at: string
}

// Upload types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export type MediaType = 'image' | 'video'

export interface FileUploadResult {
  storage_path: string
  media_type: MediaType
  mime_type: string
  file_name: string
  file_size: number
}
