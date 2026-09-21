'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/hooks/useDashboard'
import { useStories } from '@/hooks/useStories'
import StoryRing from '@/components/stories/StoryRing'
import StoryUploader from '@/components/stories/StoryUploader'
import StoryViewer from '@/components/stories/StoryViewer'
import {
  Search,
  Users,
  Flame,
  MessageCircle,
  Plus,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react'

export default function HomePage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id || ''

  const {
    stories,
    loading: storiesLoading,
    uploading,
    uploadProgress,
    uploadStory,
    sendStoryReply,
    markAsViewed,
    reactToStory,
    deleteStory,
  } = useStories(currentUserId)

  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerInitialIdx, setViewerInitialIdx] = useState(0)

  const userName = dash.myProfile?.display_name || dash.myProfile?.username || 'Friend'

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12 text-black">
      {/* 1. Welcome Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e5e5e7] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f5f7] text-[#555555] text-xs font-semibold border border-[#e5e5e7]">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>NOMORE Social</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-black">
              Welcome back, {userName}
            </h1>
            <p className="text-[#555555] text-xs sm:text-sm max-w-lg">
              Connect with friends, share 24h stories, and start direct chats in a clean, minimal space.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/search"
              className="btn-primary text-xs px-5 py-2.5 flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <Search className="w-4 h-4" />
              <span>Find Friends</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Active Stories Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5e5e7] space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-black" />
            <h2 className="font-semibold text-base text-black">
              Ephemeral Stories
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#555555] border border-[#e5e5e7]">
              24 Hours
            </span>
          </div>

          <button
            onClick={() => setIsUploaderOpen(true)}
            className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Story</span>
          </button>
        </div>

        {/* Story Ring Component */}
        <StoryRing
          currentUserId={currentUserId}
          partnerProfile={null}
          stories={stories}
          onOpenUpload={() => setIsUploaderOpen(true)}
          onOpenViewer={(idx) => {
            setViewerInitialIdx(idx)
            setIsViewerOpen(true)
          }}
        />
      </div>

      {/* 3. Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Chat Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e7] shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-black" />
              <h3 className="font-semibold text-base text-black">
                Direct Messages
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Friends Only
            </span>
          </div>

          <p className="text-xs text-[#555555]">
            Chat 1-on-1 with accepted friends. Send text messages, photos, and short videos securely.
          </p>

          <Link
            href="/chat"
            className="btn-secondary flex items-center justify-center gap-2 text-xs py-2.5 w-full"
          >
            <span>Open Conversations</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Friends & Search Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e7] shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-black" />
              <h3 className="font-semibold text-base text-black">
                Friends Network
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#555555]">
            Search for usernames (@username), send friend requests, and manage your accepted friends list.
          </p>

          <Link
            href="/friends"
            className="btn-primary flex items-center justify-center gap-2 text-xs py-2.5 w-full"
          >
            <Users className="w-4 h-4" />
            <span>Manage Friends & Requests</span>
          </Link>
        </div>
      </div>

      {/* Story Upload Modal */}
      <StoryUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onUpload={uploadStory}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        isOpen={isViewerOpen}
        initialIndex={viewerInitialIdx}
        stories={stories}
        currentUserId={currentUserId}
        partnerProfile={null}
        onClose={() => setIsViewerOpen(false)}
        onMarkAsViewed={markAsViewed}
        onReact={reactToStory}
        onDelete={deleteStory}
        onSendReply={sendStoryReply}
      />
    </div>
  )
}
