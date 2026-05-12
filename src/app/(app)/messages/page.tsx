'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Users } from 'lucide-react'

interface Contact {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  lastMessage?: string
  lastAt?: string
  unread?: number
}

interface GroupChat {
  id: string
  members: { user_id: string; profile: { name: string | null; photos: string[]; gender: string | null } }[]
  lastMessage?: string
  lastAt?: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [groups, setGroups] = useState<GroupChat[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // ── Load group chats ──────────────────────────────────────────────
      const { data: memberRows } = await supabase
        .from('group_chat_members')
        .select('chat_id')
        .eq('user_id', user.id)

      const chatIds = (memberRows ?? []).map((r: { chat_id: string }) => r.chat_id)

      if (chatIds.length > 0) {
        const { data: groupRows } = await supabase
          .from('group_chats')
          .select('id')
          .in('id', chatIds)

        const loadedGroups: GroupChat[] = []
        for (const g of groupRows ?? []) {
          const { data: allMembers } = await supabase
            .from('group_chat_members')
            .select('user_id, profile:profiles!group_chat_members_user_id_fkey(name, photos, gender)')
            .eq('chat_id', g.id)

          const { data: lastMsg } = await supabase
            .from('group_messages')
            .select('content, created_at')
            .eq('chat_id', g.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          loadedGroups.push({
            id: g.id,
            members: (allMembers ?? []) as unknown as GroupChat['members'],
            lastMessage: lastMsg?.content,
            lastAt: lastMsg?.created_at,
          })
        }
        // Sort by most recent message
        loadedGroups.sort((a, b) => {
          if (a.lastAt && b.lastAt) return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
          return 0
        })
        setGroups(loadedGroups)
      }

      // ── Load 1-on-1 contacts ─────────────────────────────────────────
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id, requester:profiles!friendships_requester_id_fkey(id, name, age, photos), receiver:profiles!friendships_receiver_id_fkey(id, name, age, photos)')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')

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

      const contactMap = new Map<string, Contact>()
      for (const f of friendships ?? []) {
        const p = (f.requester_id === user.id ? f.receiver : f.requester) as any
        if (p && !contactMap.has(p.id)) contactMap.set(p.id, { id: p.id, name: p.name, age: p.age, photos: p.photos ?? [] })
      }
      for (const p of matchProfiles) {
        if (!contactMap.has(p.id)) contactMap.set(p.id, p)
      }

      const { data: recentMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, read_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

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

  const isEmpty = contacts.length === 0 && groups.length === 0

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 26, lineHeight: 1.3 }}>Messages</h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <MessageSquare size={56} style={{ color: '#252540' }} />
          <h2 className="text-xl font-bold text-white">No conversations yet</h2>
          <p style={{ color: '#7B7A96', fontSize: 14 }}>You can message your friends and people you&apos;ve mutually matched with.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Group chats first */}
          {groups.map(g => {
            const others = g.members.filter(m => m.user_id !== userId)
            const names = others.map(m => m.profile?.name?.split(' ')[0]).filter(Boolean).join(', ')
            return (
              <button key={g.id} onClick={() => router.push(`/messages/group/${g.id}`)}
                className="card p-4 flex items-center gap-3 text-left w-full"
                style={{ borderColor: 'rgba(155,93,229,0.3)' }}>
                {/* Avatar stack */}
                <div className="relative flex-shrink-0 w-12 h-12">
                  <div className="absolute top-0 left-0 w-8 h-8 rounded-full overflow-hidden border-2"
                    style={{ background: '#13131F', borderColor: '#08080F' }}>
                    {others[0]?.profile?.photos?.[0]
                      ? <img src={others[0].profile.photos[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs">
                          {others[0]?.profile?.gender === 'male' ? '👨' : '👩'}
                        </div>}
                  </div>
                  {others[1] && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ background: '#13131F', borderColor: '#08080F' }}>
                      {others[1]?.profile?.photos?.[0]
                        ? <img src={others[1].profile.photos[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs">
                            {others[1]?.profile?.gender === 'male' ? '👨' : '👩'}
                          </div>}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm flex items-center gap-1">
                    <Users size={12} style={{ color: '#9B5DE5' }} />
                    2Man Group Chat
                  </p>
                  <p className="text-xs truncate" style={{ color: '#7B7A96' }}>{names}</p>
                  {g.lastMessage && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>{g.lastMessage}</p>
                  )}
                </div>
                {g.lastAt && (
                  <span className="text-xs flex-shrink-0" style={{ color: '#4B5563' }}>
                    {new Date(g.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </button>
            )
          })}

          {/* 1-on-1 contacts */}
          {contacts.map(c => (
            <button key={c.id} onClick={() => router.push(`/messages/${c.id}`)}
              className="card p-4 flex items-center gap-3 text-left w-full">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden" style={{ background: '#13131F' }}>
                  {c.photos?.[0]
                    ? <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                </div>
                {(c.unread ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                    style={{ background: '#9B5DE5', color: 'white' }}>{c.unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                {c.lastMessage
                  ? <p className="text-xs truncate"
                      style={{ fontWeight: (c.unread ?? 0) > 0 ? 600 : 400, color: (c.unread ?? 0) > 0 ? '#C77DFF' : '#6B7280' }}>
                      {c.lastMessage}
                    </p>
                  : <p className="text-xs" style={{ color: '#4B5563' }}>Say hi!</p>}
              </div>
              {c.lastAt && (
                <span className="text-xs flex-shrink-0" style={{ color: '#4B5563' }}>
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
