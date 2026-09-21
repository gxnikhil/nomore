'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { useFriends } from '@/hooks/useFriends'
import { Search as SearchIcon, UserPlus, Check, Clock, MessageCircle, ShieldCheck, AtSign, Loader2 } from 'lucide-react'
import { Profile } from '@/lib/types'

export default function SearchPage() {
  const { data: dash } = useDashboard('me')
  const currentUserId = dash.myProfile?.id
  const { searchUsers, sendFriendRequest, friends, outgoingRequests } = useFriends(currentUserId)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || searching) return

    setSearching(true)
    setHasSearched(true)
    const res = await searchUsers(query)
    setResults(res)
    setSearching(false)
  }

  const isFriend = (userId: string) => friends.some((f) => f.id === userId)
  const isPending = (userId: string) => outgoingRequests.some((r) => r.receiver_id === userId)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-black flex items-center gap-2">
          <span>Find Friends</span>
        </h1>
        <p className="text-xs text-[#555555]">
          Search by username (e.g. @nikhil) or display name to connect.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!e.target.value.trim()) {
                setResults([])
                setHasSearched(false)
              }
            }}
            placeholder="Search username or name..."
            className="input-field pl-10 pr-4 py-3"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || searching}
          className="btn-primary px-6 flex items-center justify-center disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Results Section */}
      <div className="space-y-3">
        {searching ? (
          <div className="p-12 text-center text-[#86868b] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <p className="text-xs">Searching NOMORE network...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((user) => {
              const friend = isFriend(user.id)
              const pending = isPending(user.id)

              return (
                <div
                  key={user.id}
                  className="p-4 bg-white border border-[#e5e5e7] rounded-2xl flex items-center justify-between shadow-sm hover:border-[#d2d2d7] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] flex items-center justify-center font-bold text-sm text-black shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || user.username || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-black">
                        {user.display_name || user.username}
                      </span>
                      {user.username && (
                        <span className="text-xs text-[#555555] flex items-center gap-0.5">
                          <AtSign className="w-3 h-3 text-[#86868b]" />
                          <span>{user.username}</span>
                        </span>
                      )}
                      {user.bio && (
                        <p className="text-[11px] text-[#86868b] truncate max-w-[180px] mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {friend ? (
                      <button
                        onClick={() => router.push(`/chat`)}
                        className="px-3.5 py-1.5 rounded-full bg-[#f5f5f7] border border-[#e5e5e7] text-black hover:bg-[#e8e8ed] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    ) : pending ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-[#f5f5f7] text-[#555555] text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : hasSearched ? (
          <div className="p-12 text-center bg-white border border-[#e5e5e7] rounded-2xl text-[#86868b] space-y-2">
            <p className="text-sm font-semibold text-black">No user found</p>
            <p className="text-xs">
              Check the spelling or try searching for another username.
            </p>
          </div>
        ) : (
          <div className="p-12 text-center bg-[#f5f5f7] border border-[#e5e5e7] rounded-2xl space-y-2">
            <ShieldCheck className="w-8 h-8 text-[#555555] mx-auto opacity-40" />
            <p className="text-xs font-medium text-[#555555]">
              Search for friends to start chatting and viewing stories.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
