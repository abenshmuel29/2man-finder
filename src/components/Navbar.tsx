'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Compass, Heart, LogOut, User, Search, MessageSquare } from 'lucide-react'

const links = [
  { href: '/discover', label: 'Discover', icon: Compass, notifKey: null as null | string },
  { href: '/search', label: 'Search', icon: Search, notifKey: null },
  { href: '/proposals', label: '2Mans', icon: Heart, notifKey: 'dates' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, notifKey: 'messages' },
  { href: '/profile', label: 'Profile', icon: User, notifKey: null },
]

type Counts = { dates: number; messages: number }

function getSeenCounts(): Counts {
  if (typeof window === 'undefined') return { dates: 0, messages: 0 }
  return {
    dates: parseInt(localStorage.getItem('seen_dates') ?? '0'),
    messages: parseInt(localStorage.getItem('seen_messages') ?? '0'),
  }
}
function saveSeenCount(key: keyof Counts, value: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`seen_${key}`, String(value))
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifs, setNotifs] = useState<Counts>({ dates: 0, messages: 0 })
  const [seen, setSeen] = useState<Counts>({ dates: 0, messages: 0 })

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: Counts) => setNotifs(data))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    setSeen(getSeenCounts())
    if (pathname === '/proposals') {
      setNotifs(prev => {
        saveSeenCount('dates', prev.dates)
        setSeen(s => ({ ...s, dates: prev.dates }))
        return prev
      })
    }
    if (pathname === '/messages') {
      setNotifs(prev => {
        saveSeenCount('messages', prev.messages)
        setSeen(s => ({ ...s, messages: prev.messages }))
        return prev
      })
    }
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
        style={{ background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/discover">
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-syne)' }}>2Man Finder</span>
        </Link>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-3"
        style={{ background: 'rgba(8,8,15,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {links.map(({ href, label, icon: Icon, notifKey }) => {
          const active = pathname === href
          const count = notifKey ? notifs[notifKey as keyof Counts] : 0
          const seenCount = notifKey ? seen[notifKey as keyof Counts] : 0
          const showDot = !active && count > seenCount
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-1 transition-colors"
              style={{ color: active ? '#FF4D6D' : '#7B7A96' }}>
              <div className="relative">
                <Icon size={22} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                    style={{ background: '#FF4D6D', border: '2px solid #08080F' }} />
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
