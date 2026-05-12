'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Compass, Heart, LogOut, User, Search, MessageSquare } from 'lucide-react'

const links = [
  { href: '/discover', label: 'Discover', icon: Compass, notif: null as null | 'dates' | 'friends' | 'messages' },
  { href: '/search', label: 'Search', icon: Search, notif: null },
  { href: '/proposals', label: 'Dates', icon: Heart, notif: 'dates' as const },
  { href: '/messages', label: 'Messages', icon: MessageSquare, notif: 'messages' as const },
  { href: '/profile', label: 'Profile', icon: User, notif: null },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifs, setNotifs] = useState({ dates: 0, friends: 0, messages: 0 })

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifs(data))
      .catch(() => {})
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(13,13,26,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2D2D50' }}>
        <Link href="/discover">
          <span className="text-xl font-bold gradient-text">2Man Finder</span>
        </Link>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-3"
        style={{ background: 'rgba(13,13,26,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2D2D50' }}>
        {links.map(({ href, label, icon: Icon, notif }) => {
          const active = pathname === href || (href === '/proposals' && pathname === '/proposals')
          const count = notif ? notifs[notif as keyof typeof notifs] : 0
          const showDot = count > 0 && !active
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 transition-colors"
              style={{ color: active ? '#8B5CF6' : '#6B7280' }}>
              <div className="relative">
                <Icon size={22} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                    style={{ background: '#EC4899', border: '2px solid rgba(13,13,26,0.95)' }} />
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
