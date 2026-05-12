'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Search, UserPlus, Clock, Check, Users } from 'lucide-react'

interface Profile {
  id: string
  name: string | null
  age: number | null
  gender: string | null
  photos: string[]
  neighborhood: string | null
  bio: string | null
  job: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [myGender, setMyGender] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [friendStatus, setFriendStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)

      const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
      if (me) setMyGender(me.gender)

      // Load existing friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id, status')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

      const statusMap: Record<string, string> = {}
      const myFriendIds: string[] = []
      for (const f of friendships ?? []) {
        const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id
        statusMap[otherId] = f.status === 'accepted' ? 'accepted' : (f.requester_id === user.id ? 'sent' : 'pending')
        if (f.status === 'accepted') myFriendIds.push(otherId)
      }
      setFriendStatus(statusMap)

      // Friends of friends — same gender as me, not already connected
      if (myFriendIds.length > 0 && me?.gender) {
        const { data: fofFriendships } = await supabase
          .from('friendships')
          .select('requester_id, receiver_id')
          .or(myFriendIds.map(id => `requester_id.eq.${id},receiver_id.eq.${id}`).join(','))
          .eq('status', 'accepted')

        const fofIds = new Set<string>()
        for (const f of fofFriendships ?? []) {
          const a = f.requester_id
          const b = f.receiver_id
          if (myFriendIds.includes(a) && b !== user.id && !myFriendIds.includes(b) && !statusMap[b]) fofIds.add(b)
          if (myFriendIds.includes(b) && a !== user.id && !myFriendIds.includes(a) && !statusMap[a]) fofIds.add(a)
        }

        if (fofIds.size > 0) {
          const { data: fofProfiles } = await supabase
            .from('profiles')
            .select('id, name, age, gender, photos, neighborhood, bio, job')
            .in('id', [...fofIds])
            .eq('profile_complete', true)
            .eq('gender', me.gender)
            .limit(15)
          setSuggestions(fofProfiles ?? [])
        }
      }
    }
    init()
  }, [])

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, age, gender, photos, neighborhood, bio, job')
      .ilike('name', `%${q.trim()}%`)
      .eq('profile_complete', true)
      .neq('id', myId ?? '')
      .limit(20)
    setResults(data ?? [])
    setLoading(false)
  }

  async function sendFollowRequest(targetId: string) {
    setFriendStatus(prev => ({ ...prev, [targetId]: 'sent' }))
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: targetId }),
    })
    if (!res.ok) setFriendStatus(prev => { const n = { ...prev }; delete n[targetId]; return n })
  }

  function FriendButton({ profile }: { profile: Profile }) {
    if (profile.gender !== myGender) return null
    const status = friendStatus[profile.id]
    if (status === 'accepted') return <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><Check size={13} /> Friends</span>
    if (status === 'sent') return <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={13} /> Requested</span>
    if (status === 'pending') return <span className="text-xs text-yellow-400">Wants to follow</span>
    return (
      <button onClick={() => sendFollowRequest(profile.id)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: '#8B5CF6', color: 'white' }}>
        <UserPlus size={13} /> Follow
      </button>
    )
  }

  function ProfileRow({ profile }: { profile: Profile }) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
            {profile.photos?.[0]
              ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">
                  {profile.gender === 'male' ? '👨' : '👩'}
                </div>}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white">{profile.name}{profile.age ? `, ${profile.age}` : ''}</p>
            {profile.neighborhood && <p className="text-xs text-gray-500">{profile.neighborhood}</p>}
            {profile.job && <p className="text-xs text-gray-400">{profile.job}</p>}
            {profile.bio && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{profile.bio}</p>}
          </div>
        </Link>
        <div className="flex-shrink-0">
          <FriendButton profile={profile} />
        </div>
      </div>
    )
  }

  const showSearch = query.trim().length >= 2

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-gray-500 text-sm">Find people in Miami</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input-field pl-10" placeholder="Search by name..."
          value={query} onChange={e => handleSearch(e.target.value)} />
      </div>

      {loading && <p className="text-gray-500 text-sm text-center">Searching...</p>}

      {showSearch ? (
        <div className="flex flex-col gap-3">
          {results.map(p => <ProfileRow key={p.id} profile={p} />)}
          {!loading && results.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No one found with that name.</p>
          )}
        </div>
      ) : (
        <>
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-purple-400" /> People You May Know
              </h2>
              <p className="text-xs text-gray-500 -mt-1">Friends of your friends — great for setting up a 2Man</p>
              {suggestions.map(p => <ProfileRow key={p.id} profile={p} />)}
            </div>
          )}
          {suggestions.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">Search for people by name above.</p>
          )}
        </>
      )}
    </div>
  )
}
