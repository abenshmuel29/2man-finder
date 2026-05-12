'use client'

import { useState, useEffect, useMemo } from 'react'
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
}

const HOOD_FILTERS = [
  { label: 'All', value: '' },
  { label: 'South Beach', value: 'south_beach' },
  { label: 'Brickell', value: 'brickell' },
  { label: 'Wynwood', value: 'wynwood' },
  { label: 'Midtown', value: 'midtown' },
  { label: 'Downtown', value: 'downtown' },
  { label: 'Coral Gables', value: 'coral_gables' },
  { label: 'Coconut Grove', value: 'coconut_grove' },
  { label: 'Miami Shores', value: 'miami_shores' },
  { label: 'Miami Beach', value: 'miami_beach' },
  { label: 'North Miami', value: 'north_miami' },
  { label: 'Aventura', value: 'aventura' },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [myGender, setMyGender] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [myFriendIds, setMyFriendIds] = useState<string[]>([])
  const [friendFriendIds, setFriendFriendIds] = useState<string[]>([]) // all friends-of-friends IDs
  const [friendsOfFriends, setFriendsOfFriends] = useState<Map<string, string[]>>(new Map()) // profileId → shared friend IDs
  const [friendProfiles, setFriendProfiles] = useState<Map<string, { name: string | null; photos: string[] }>>(new Map()) // friendId → profile
  const [loading, setLoading] = useState(false)
  const [friendStatus, setFriendStatus] = useState<Record<string, string>>({})
  const [hoodFilter, setHoodFilter] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)

      const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
      if (me) setMyGender(me.gender)

      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id, status')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

      const statusMap: Record<string, string> = {}
      const myFriends: string[] = []
      for (const f of friendships ?? []) {
        const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id
        statusMap[otherId] = f.status === 'accepted' ? 'accepted' : (f.requester_id === user.id ? 'sent' : 'pending')
        if (f.status === 'accepted') myFriends.push(otherId)
      }
      setFriendStatus(statusMap)
      setMyFriendIds(myFriends)

      // Fetch my friends' profiles (for mutual friend photos)
      if (myFriends.length > 0) {
        const { data: friendProfileRows } = await supabase
          .from('profiles')
          .select('id, name, photos')
          .in('id', myFriends)
        const fpMap = new Map<string, { name: string | null; photos: string[] }>()
        for (const p of friendProfileRows ?? []) fpMap.set(p.id, { name: p.name, photos: p.photos ?? [] })
        setFriendProfiles(fpMap)
      }

      // Load friends-of-friends for suggestions + mutual friend counts
      if (myFriends.length > 0 && me?.gender) {
        const { data: fofFriendships } = await supabase
          .from('friendships')
          .select('requester_id, receiver_id')
          .or(myFriends.map(id => `requester_id.eq.${id},receiver_id.eq.${id}`).join(','))
          .eq('status', 'accepted')

        // Build map: stranger → [shared friends]
        const mutualMap = new Map<string, string[]>()
        for (const f of fofFriendships ?? []) {
          const a = f.requester_id, b = f.receiver_id
          const myFriend = myFriends.includes(a) ? a : b
          const stranger = myFriends.includes(a) ? b : a
          if (stranger === user.id || myFriends.includes(stranger) || statusMap[stranger]) continue
          if (!mutualMap.has(stranger)) mutualMap.set(stranger, [])
          mutualMap.get(stranger)!.push(myFriend)
        }
        setFriendsOfFriends(mutualMap)
        setFriendFriendIds([...mutualMap.keys()])

        const fofIds = [...mutualMap.keys()]
        if (fofIds.length > 0) {
          const { data: fofProfiles } = await supabase
            .from('profiles')
            .select('id, name, age, gender, photos, neighborhood, bio')
            .in('id', fofIds)
            .eq('profile_complete', true)
            .eq('gender', me.gender)
            .limit(20)
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
    let query2 = supabase
      .from('profiles')
      .select('id, name, age, gender, photos, neighborhood, bio')
      .ilike('name', `%${q.trim()}%`)
      .eq('profile_complete', true)
      .neq('id', myId ?? '')
      .limit(20)
    const { data } = await query2
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

  function MutualBadge({ profileId }: { profileId: string }) {
    const shared = friendsOfFriends.get(profileId) ?? []
    const count = shared.length
    if (count === 0) return null
    const firstFriend = friendProfiles.get(shared[0])
    const photo = firstFriend?.photos?.[0]
    return (
      <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: 'rgba(155,93,229,0.15)', border: '1px solid rgba(155,93,229,0.3)', color: '#C77DFF' }}>
        {photo
          ? <img src={photo} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          : <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: '#252540' }} />}
        {count} mutual friend{count !== 1 ? 's' : ''}
      </span>
    )
  }

  function FriendButton({ profile }: { profile: Profile }) {
    if (profile.gender !== myGender) return null
    const status = friendStatus[profile.id]
    if (status === 'accepted') return <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#4ADE80' }}><Check size={13} /> Friends</span>
    if (status === 'sent') return <span className="flex items-center gap-1 text-xs" style={{ color: '#7B7A96' }}><Clock size={13} /> Requested</span>
    if (status === 'pending') return <span className="text-xs" style={{ color: '#FBBF24' }}>Wants to follow</span>
    return (
      <button onClick={() => sendFollowRequest(profile.id)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
        style={{ background: 'linear-gradient(135deg,#FF4D6D,#9B5DE5)', color: 'white' }}>
        <UserPlus size={13} /> Follow
      </button>
    )
  }

  function ProfileRow({ profile }: { profile: Profile }) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#13131F' }}>
            {profile.photos?.[0]
              ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">
                  {profile.gender === 'male' ? '👨' : '👩'}
                </div>}
          </div>
          <div className="min-w-0">
            <p style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</p>
            {profile.neighborhood && <p style={{ color: '#7B7A96', fontSize: 12, lineHeight: 1.5 }}>{profile.neighborhood.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>}
            <MutualBadge profileId={profile.id} />
          </div>
        </Link>
        <div className="flex-shrink-0">
          <FriendButton profile={profile} />
        </div>
      </div>
    )
  }

  const showSearch = query.trim().length >= 2
  const filteredResults = useMemo(() => {
    if (!hoodFilter) return results
    return results.filter(p => p.neighborhood === hoodFilter)
  }, [results, hoodFilter])
  const filteredSuggestions = useMemo(() => {
    if (!hoodFilter) return suggestions
    return suggestions.filter(p => p.neighborhood === hoodFilter)
  }, [suggestions, hoodFilter])
  const activeHoodLabel = HOOD_FILTERS.find(h => h.value === hoodFilter)?.label ?? 'this area'

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 26, lineHeight: 1.3 }}>Search</h1>
        <p style={{ color: '#7B7A96', fontSize: 13, lineHeight: 1.5 }}>Find people in Miami</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7B7A96' }} />
        <input className="input-field pl-10" placeholder="Search by name..."
          value={query} onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* Neighborhood filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {HOOD_FILTERS.map(h => {
          const active = hoodFilter === h.value
          return (
            <button key={h.value} onClick={() => setHoodFilter(h.value)}
              className="flex-shrink-0 px-4 py-1.5 text-sm font-medium transition-all"
              style={{
                borderRadius: 100,
                background: active ? 'linear-gradient(135deg,#FF4D6D,#9B5DE5)' : '#13131F',
                border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                color: active ? 'white' : '#7B7A96',
                boxShadow: active ? '0 4px 12px rgba(155,93,229,0.3)' : 'none',
              }}>
              {h.label}
            </button>
          )
        })}
      </div>

      {loading && <p style={{ color: '#7B7A96', fontSize: 13, textAlign: 'center' }}>Searching...</p>}

      {showSearch ? (
        <div className="flex flex-col gap-3">
          {filteredResults.map(p => <ProfileRow key={p.id} profile={p} />)}
          {!loading && filteredResults.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span style={{ fontSize: 40 }}>📍</span>
              <p style={{ color: '#7B7A96', fontSize: 14, lineHeight: 1.6 }}>
                {hoodFilter ? `No one in ${activeHoodLabel} yet — check back soon!` : 'No one found with that name.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {filteredSuggestions.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, lineHeight: 1.4 }} className="flex items-center gap-2">
                <Users size={16} style={{ color: '#9B5DE5' }} /> People You May Know
              </h2>
              <p style={{ color: '#7B7A96', fontSize: 12, lineHeight: 1.5, marginTop: -8 }}>Friends of your friends — great for setting up a 2Man</p>
              {filteredSuggestions.map(p => <ProfileRow key={p.id} profile={p} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={{ color: '#7B7A96', fontSize: 14, lineHeight: 1.6 }}>
                {hoodFilter ? `No one in ${activeHoodLabel} yet — check back soon!` : 'Search for people by name above.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
