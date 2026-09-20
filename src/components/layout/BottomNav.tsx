'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, Images, MessageCircle, User } from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'Stories',
    href: '/stories',
    icon: Flame,
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

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 backdrop-blur-xl pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={`Navigate to ${item.name}`}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-all ${
                isActive
                  ? 'text-[var(--color-accent)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-[var(--color-accent)]' : ''
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-accent)]" />
                )}
              </div>
              <span className="mt-1 leading-none">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
