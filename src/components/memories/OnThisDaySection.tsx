'use client'

import { SavedMedia } from '@/lib/types'
import { Sparkles, Calendar, Heart } from 'lucide-react'

interface OnThisDaySectionProps {
  memories: SavedMedia[]
  onOpenMedia: (media: SavedMedia) => void
}

export default function OnThisDaySection({ memories, onOpenMedia }: OnThisDaySectionProps) {
  if (!memories || memories.length === 0) return null

  return (
    <div className="glass-card p-6 rounded-2xl border border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-bg-card)] via-[var(--color-bg-secondary)] to-[var(--color-accent-dark)]/10 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-[var(--color-text-primary)]">
              On This Day
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Moments from this exact date in previous years
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {memories.map((mem) => {
          const year = new Date(mem.memory_date || mem.created_at).getFullYear()

          return (
            <div
              key={mem.id}
              onClick={() => onOpenMedia(mem)}
              className="aspect-square rounded-xl overflow-hidden bg-black border border-[var(--color-border)] relative group cursor-pointer shadow-md hover:scale-[1.02] transition-all"
            >
              {mem.media_url ? (
                mem.media_type === 'image' ? (
                  <img src={mem.media_url} alt="On This Day" className="w-full h-full object-cover" />
                ) : (
                  <video src={mem.media_url} className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                  Media
                </div>
              )}

              {/* Year badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/30">
                {year}
              </div>

              {mem.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] text-white truncate">
                  {mem.caption}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
