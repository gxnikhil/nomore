'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  Users,
  MessageCircle,
  Flame,
  User,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    name: 'Friends',
    href: '/friends',
    icon: Users,
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
  },
  {
    name: 'Stories',
    href: '/stories',
    icon: Flame,
    badge: '24h',
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
    <aside className="hidden md:flex flex-col w-64 border-r border-[#e5e5e7] bg-white p-4 min-h-[calc(100dvh-4rem)]">
      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={`Navigate to ${item.name}`}
              className={`flex items-center justify-between px-4 py-3 rounded-full text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-black text-white shadow-sm'
                  : 'text-[#555555] hover:text-black hover:bg-[#f5f5f7]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-white' : 'text-[#86868b]'
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#f5f5f7] text-black border border-[#e5e5e7]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer info */}
      <div className="pt-4 border-t border-[#e5e5e7]">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all ${
            pathname === '/settings'
              ? 'bg-black text-white'
              : 'text-[#555555] hover:text-black hover:bg-[#f5f5f7]'
          }`}
        >
          <Settings className="w-5 h-5 text-[#86868b]" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  )
}
