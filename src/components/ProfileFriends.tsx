'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Clock, Check } from 'lucide-react'

interface Profile {
  id: string
  name: string | null
  age: number | null
  gender: string | null
  photos: string[]
  neighborhood: string | null
}

export default function ProfileFriends({ profileId, profileGender }: { profileId: string; profileGender: string }) {
  const [friends, setFriends] = useState<Profile[]>([])
  const [myGender, setMyGender] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
      if (!me) return
      setMyGender(me.gender)

      // Only show friends section if viewer is opposite gender
      if (me.gender === profileGender) return

      // Get this profile's accepted friends (same gender as them)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .eq('status', 'accepted')

      const friendIds = (friendships ?? [])
        .map(f => f.requester_id === profileId ? f.receiver_id : f.requester_id)
        .filter(id => id !== user.id)

      if (friendIds.length === 0) return

      // Load their profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, age, gender, photos, neighborhood')
        .in('id', friendIds)
        .eq('profile_complete', true)
        .eq('gender', profileGender)
        .limit(10)

      setFriends(profiles ?? [])

      // Check my existing friendship status with each
      if ((profiles ?? []).length > 0) {
        const { data: myFriendships } = await supabase
          .from('friendships')
          .select('requester_id, receiver_id, status')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

        const statusMap: Record<string, string> = {}
        for (const f of myFriendships ?? []) {
          const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id
          statusMap[otherId] = f.status === 'accepted' ? 'accepted' : (f.requester_id === user.id ? 'sent' : 'pending')
        }
        setFriendStatus(statusMap)
      }
    }
    load()
  }, [profileId, profileGender])

  async function sendFollowRequest(targetId: string) {
    setFriendStatus(prev => ({ ...prev, [targetId]: 'sent' }))
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: targetId }),
    })
    if (!res.ok) setFriendStatus(prev => { const n = { ...prev }; delete n[targetId]; return n })
  }

  // Don't render if same gender or no friends
  if (myGender === profileGender || friends.length === 0) return null

  const pronoun = profileGender === 'female' ? 'Her' : 'His'

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-bold text-white">{pronoun} Friends</h2>
        <p className="text-xs text-gray-500 mt-0.5">Add one to set up a 2Man</p>
      </div>
      <div className="flex flex-col gap-2">
        {friends.map(friend => {
          const status = friendStatus[friend.id]
          return (
            <div key={friend.id} className="card p-3 flex items-center gap-3">
              <Link href={`/profile/${friend.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                  {friend.photos?.[0]
                    ? <img src={friend.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">
                        {friend.gender === 'male' ? '👨' : '👩'}
                      </div>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">{friend.name}{friend.age ? `, ${friend.age}` : ''}</p>
                  {friend.neighborhood && <p className="text-xs text-gray-500">{friend.neighborhood}</p>}
                </div>
              </Link>
              <div className="flex-shrink-0">
                {status === 'accepted' ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><Check size={13} /> Friends</span>
                ) : status === 'sent' ? (
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={13} /> Requested</span>
                ) : status === 'pending' ? (
                  <span className="text-xs text-yellow-400">Wants to follow</span>
                ) : (
                  <button onClick={() => sendFollowRequest(friend.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: '#8B5CF6', color: 'white' }}>
                    <UserPlus size={13} /> Follow
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
