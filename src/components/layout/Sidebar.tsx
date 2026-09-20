'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Flame,
  Images,
  MessageCircle,
  User,
  Settings,
  Heart,
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'Stories',
    href: '/stories',
    icon: Flame,
    badge: '24h',
  },
  {
    name: 'Memories',
    href: '/memories',
    icon: Images,
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 min-h-[calc(100dvh-4rem)]">
      <nav className="space-y-1.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={`Navigate to ${item.name}`}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--color-accent-dark)]/20 to-transparent border-l-2 border-[var(--color-accent)] text-[var(--color-text-primary)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer info card */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            pathname === '/settings'
              ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
          }`}
        >
          <Settings className="w-5 h-5 text-[var(--color-text-muted)]" />
          <span>Settings</span>
        </Link>

        <div className="mt-4 p-3 rounded-xl glass-card text-center text-xs text-[var(--color-text-muted)]">
          <p className="flex items-center justify-center gap-1">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-[var(--color-rose)] fill-[var(--color-rose)] inline" />
            <span>just for us</span>
          </p>
        </div>
      </div>
    </aside>
  )
}
