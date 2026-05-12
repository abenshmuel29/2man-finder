'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare } from 'lucide-react'

interface Contact {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  lastMessage?: string
  lastAt?: string
  unread?: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Get accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id, requester:profiles!friendships_requester_id_fkey(id, name, age, photos), receiver:profiles!friendships_receiver_id_fkey(id, name, age, photos)')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')

      // Get mutual matches (opposite gender)
      const { data: myLikes } = await supabase.from('interests').select('to_user_id').eq('from_user_id', user.id)
      const { data: likedMe } = await supabase.from('interests').select('from_user_id').eq('to_user_id', user.id)
      const myLikedIds = new Set(myLikes?.map(l => l.to_user_id) ?? [])
      const likedMeIds = new Set(likedMe?.map(l => l.from_user_id) ?? [])
      const mutualIds = [...myLikedIds].filter(id => likedMeIds.has(id))

      let matchProfiles: Contact[] = []
      if (mutualIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, age, photos')
          .in('id', mutualIds)
        matchProfiles = data ?? []
      }

      // Build contacts map (friends + matches, deduplicated)
      const contactMap = new Map<string, Contact>()
      for (const f of friendships ?? []) {
        const p = (f.requester_id === user.id ? f.receiver : f.requester) as any
        if (p && !contactMap.has(p.id)) contactMap.set(p.id, { id: p.id, name: p.name, age: p.age, photos: p.photos ?? [] })
      }
      for (const p of matchProfiles) {
        if (!contactMap.has(p.id)) contactMap.set(p.id, p)
      }

      // Get last message per contact
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, read_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

      // Attach last message + unread count to each contact
      const lastMsgMap = new Map<string, { content: string; at: string; unread: number }>()
      for (const msg of recentMessages ?? []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        if (!lastMsgMap.has(partnerId)) {
          const unread = msg.sender_id !== user.id && !msg.read_at ? 1 : 0
          lastMsgMap.set(partnerId, { content: msg.content, at: msg.created_at, unread })
        } else if (msg.sender_id !== user.id && !msg.read_at) {
          const cur = lastMsgMap.get(partnerId)!
          lastMsgMap.set(partnerId, { ...cur, unread: cur.unread + 1 })
        }
      }

      const result = [...contactMap.values()].map(c => ({
        ...c,
        lastMessage: lastMsgMap.get(c.id)?.content,
        lastAt: lastMsgMap.get(c.id)?.at,
        unread: lastMsgMap.get(c.id)?.unread ?? 0,
      })).sort((a, b) => {
        if (a.lastAt && b.lastAt) return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
        if (a.lastAt) return -1
        if (b.lastAt) return 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      })

      setContacts(result)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-bold text-white">Messages</h1>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="text-6xl"><MessageSquare size={56} className="text-gray-700" /></div>
          <h2 className="text-xl font-bold text-white">No conversations yet</h2>
          <p className="text-gray-400 text-sm">You can message your friends and people you've mutually matched with.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {contacts.map(c => (
            <button key={c.id} onClick={() => router.push(`/messages/${c.id}`)}
              className="card p-4 flex items-center gap-3 text-left w-full hover:border-purple-800 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden" style={{ background: '#252540' }}>
                  {c.photos?.[0]
                    ? <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                </div>
                {(c.unread ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                    style={{ background: '#8B5CF6', color: 'white' }}>{c.unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                {c.lastMessage
                  ? <p className="text-xs text-gray-500 truncate" style={{ fontWeight: (c.unread ?? 0) > 0 ? 600 : 400, color: (c.unread ?? 0) > 0 ? '#C4B5FD' : '#6B7280' }}>{c.lastMessage}</p>
                  : <p className="text-xs text-gray-600">Say hi!</p>}
              </div>
              {c.lastAt && (
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {new Date(c.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
