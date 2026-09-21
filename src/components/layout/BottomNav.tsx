'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Users, MessageCircle, Flame, User } from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e5e7] bg-white/95 backdrop-blur-xl pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={`Navigate to ${item.name}`}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-all ${
                isActive ? 'text-black' : 'text-[#86868b] hover:text-black'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-black stroke-[2.5]' : 'stroke-[1.5]'
                  }`}
                />
              </div>
              <span className="mt-1 leading-none">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
