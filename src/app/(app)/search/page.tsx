'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserPlus, Check } from 'lucide-react'

interface Profile {
  id: string
  name: string | null
  age: number | null
  gender: string | null
  photos: string[]
  neighborhood: string | null
  bio: string | null
  job: string | null
  school: string | null
}

interface Group {
  id: string
  name: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [myGender, setMyGender] = useState<string | null>(null)
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState<string | null>(null)
  const [invited, setInvited] = useState<Record<string, string>>({}) // userId -> groupId
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)
      const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
      if (me) setMyGender(me.gender)
      // Load my groups (groups I'm an approved member of)
      const { data: memberships } = await supabase
        .from('friend_group_members')
        .select('group_id, friend_groups(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
      if (memberships) {
        setMyGroups(memberships.map((m: any) => m.friend_groups).filter(Boolean))
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
      .select('id, name, age, gender, photos, neighborhood, bio, job, school')
      .ilike('name', `%${q.trim()}%`)
      .eq('profile_complete', true)
      .neq('id', myId ?? '')
      .limit(20)
    setResults(data ?? [])
    setLoading(false)
  }

  async function inviteToGroup(targetUserId: string, groupId: string) {
    setInviting(true)
    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: targetUserId }),
    })
    if (res.ok) {
      setInvited(prev => ({ ...prev, [targetUserId]: groupId }))
    }
    setInviteOpen(null)
    setInviting(false)
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-gray-500 text-sm">Find people in Miami</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input-field pl-10"
          placeholder="Search by name..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-gray-500 text-sm text-center">Searching...</p>}

      <div className="flex flex-col gap-3">
        {results.map(profile => {
          const isSameGender = profile.gender === myGender
          const alreadyInvited = invited[profile.id]
          const isOpen = inviteOpen === profile.id

          return (
            <div key={profile.id} className="card p-4 flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                {profile.photos?.[0]
                  ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">
                      {profile.gender === 'male' ? '👨' : '👩'}
                    </div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{profile.name}{profile.age ? `, ${profile.age}` : ''}</p>
                    {profile.neighborhood && <p className="text-xs text-gray-500">{profile.neighborhood}</p>}
                    {profile.job && <p className="text-xs text-gray-400">{profile.job}</p>}
                    {profile.bio && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{profile.bio}</p>}
                  </div>
                  {isSameGender && myGroups.length > 0 && (
                    <div className="relative flex-shrink-0">
                      {alreadyInvited ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                          <Check size={13} /> Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => setInviteOpen(isOpen ? null : profile.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: '#8B5CF6', color: 'white' }}>
                          <UserPlus size={13} /> Invite
                        </button>
                      )}
                      {isOpen && (
                        <div className="absolute right-0 top-8 z-10 rounded-xl shadow-xl overflow-hidden"
                          style={{ background: '#1A1A2E', border: '1px solid #2D2D50', minWidth: '160px' }}>
                          <p className="text-xs text-gray-500 px-3 pt-2 pb-1">Invite to group:</p>
                          {myGroups.map(g => (
                            <button key={g.id} disabled={inviting}
                              onClick={() => inviteToGroup(profile.id, g.id)}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-purple-900 transition-colors">
                              {g.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No one found with that name.</p>
        )}
      </div>
    </div>
  )
}
