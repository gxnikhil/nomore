'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { useFriends } from '@/hooks/useFriends'
import { Users, UserCheck, Clock, MessageCircle, UserMinus, AtSign, Loader2, Check, X } from 'lucide-react'

export default function FriendsPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
  } = useFriends(currentUserId)

  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
            <span>Friends</span>
          </h1>
          <p className="text-xs text-[#555555]">
            Manage your network, accept requests, and message friends.
          </p>
        </div>

        <button
          onClick={() => router.push('/search')}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <span>Find Friends</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e5e5e7] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('friends')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'border-black text-black'
              : 'border-transparent text-[#86868b] hover:text-black'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Friends ({friends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-black text-black'
              : 'border-transparent text-[#86868b] hover:text-black'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Requests ({incomingRequests.length})</span>
          {incomingRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 text-center text-[#86868b] flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
          <p className="text-xs">Loading friends...</p>
        </div>
      ) : activeTab === 'friends' ? (
        /* My Friends List */
        friends.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="p-4 bg-white border border-[#e5e5e7] rounded-2xl flex items-center justify-between shadow-sm hover:border-[#d2d2d7] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] flex items-center justify-center font-bold text-sm text-black shrink-0 overflow-hidden">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.display_name || friend.username || 'Friend'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {(friend.display_name || friend.username || 'F').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-black">
                      {friend.display_name || friend.username}
                    </span>
                    {friend.username && (
                      <span className="text-xs text-[#555555] flex items-center gap-0.5">
                        <AtSign className="w-3 h-3 text-[#86868b]" />
                        <span>{friend.username}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/chat')}
                    className="p-2 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] text-black hover:bg-[#e8e8ed] transition-colors"
                    title="Open chat"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => unfriend(friend.id)}
                    className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                    title="Unfriend"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-[#e5e5e7] rounded-2xl space-y-3">
            <Users className="w-10 h-10 text-[#86868b] mx-auto" />
            <h3 className="font-semibold text-black">No friends yet</h3>
            <p className="text-xs text-[#555555] max-w-sm mx-auto">
              Search for friends by username to build your private social network on NOMORE.
            </p>
            <button
              onClick={() => router.push('/search')}
              className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-1.5"
            >
              <span>Search Users</span>
            </button>
          </div>
        )
      ) : (
        /* Friend Requests List */
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
              Incoming Requests ({incomingRequests.length})
            </h3>

            {incomingRequests.length > 0 ? (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white border border-[#e5e5e7] rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] flex items-center justify-center font-bold text-xs text-black shrink-0 overflow-hidden">
                        {req.sender?.avatar_url ? (
                          <img
                            src={req.sender.avatar_url}
                            alt={req.sender.display_name || 'Sender'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {(req.sender?.display_name || req.sender?.username || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-black">
                          {req.sender?.display_name || req.sender?.username}
                        </span>
                        {req.sender?.username && (
                          <span className="text-xs text-[#555555]">
                            @{req.sender.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id, req.sender_id)}
                        className="px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-[#222222] text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] text-[#555555] hover:text-black hover:bg-[#e8e8ed] text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#86868b] italic">No incoming friend requests.</p>
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="space-y-3 pt-4 border-t border-[#e5e5e7]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
              Outgoing Requests ({outgoingRequests.length})
            </h3>

            {outgoingRequests.length > 0 ? (
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-black">
                        {req.receiver?.display_name || req.receiver?.username}
                      </span>
                      {req.receiver?.username && (
                        <span className="text-[#86868b]">@{req.receiver.username}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-[#555555] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending response</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#86868b] italic">No pending outgoing requests.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
