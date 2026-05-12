'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ProposalCard from '@/components/ProposalCard'
import { Heart, Users, Check, X } from 'lucide-react'

interface MiniProfile {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  neighborhood: string | null
  gender?: string | null
  job?: string | null
}

interface Friendship {
  id: string
  status: string
  requester_id: string
  receiver_id: string
  requester: MiniProfile
  receiver: MiniProfile
}

interface InterestRow {
  from_user_id: string
  to_user_id: string
  profile: MiniProfile
}

function MiniCard({ profile, status, onAction }: {
  profile: MiniProfile
  status: 'waiting' | 'matched' | 'incoming'
  onAction?: (action: '2man' | 'pass') => void
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
          {profile.photos?.[0]
            ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl">
                {profile.gender === 'male' ? '👨' : '👩'}
              </div>}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm">{profile.name}{profile.age ? `, ${profile.age}` : ''}</p>
          {profile.neighborhood && <p className="text-xs text-gray-500">{profile.neighborhood}</p>}
        </div>
      </Link>
      <div className="flex-shrink-0">
        {status === 'waiting' && (
          <span className="text-xs text-gray-400">Waiting for response...</span>
        )}
        {status === 'matched' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-pink-400">
            ❤️ Matched!
          </span>
        )}
        {status === 'incoming' && onAction && (
          <div className="flex gap-2">
            <button onClick={() => onAction('2man')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white' }}>
              2Man
            </button>
            <button onClick={() => onAction('pass')}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#252540' }}>
              <X size={13} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DatesAndFriendsPage() {
  const [tab, setTab] = useState<'dates' | 'friends'>('dates')
  const [userId, setUserId] = useState<string | null>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [myLikes, setMyLikes] = useState<InterestRow[]>([])
  const [likesForMe, setLikesForMe] = useState<InterestRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Kick off recalculation in background to catch any missed proposals
    fetch('/api/proposals/recalculate', { method: 'POST' })

    const [rawProposalsRes, friendsRes, confirmRes, myLikesRes, likesForMeRes] = await Promise.all([
      supabase.from('double_date_proposals')
        .select('*')
        .or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      fetch('/api/friends').then(r => r.json()),
      supabase.from('proposal_confirmations').select('proposal_id').eq('user_id', user.id),
      supabase.from('interests').select('from_user_id, to_user_id, profiles!interests_to_user_id_fkey(id, name, age, photos, neighborhood, gender, job)').eq('from_user_id', user.id),
      supabase.from('interests').select('from_user_id, to_user_id, profiles!interests_from_user_id_fkey(id, name, age, photos, neighborhood, gender, job)').eq('to_user_id', user.id),
    ])

    // Fetch profiles for proposals separately to avoid FK name dependency
    const rawProposals = rawProposalsRes.data ?? []
    const profileIds = [...new Set(rawProposals.flatMap((p: any) => [p.guy1_id, p.guy2_id, p.girl1_id, p.girl2_id]))]
    let profileMap: Record<string, any> = {}
    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, age, photos, neighborhood, job, snapchat, instagram')
        .in('id', profileIds)
      profileMap = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))
    }
    const proposals = rawProposals.map((p: any) => ({
      ...p,
      guy1: profileMap[p.guy1_id] ?? null,
      guy2: profileMap[p.guy2_id] ?? null,
      girl1: profileMap[p.girl1_id] ?? null,
      girl2: profileMap[p.girl2_id] ?? null,
    }))

    setProposals(proposals)
    setFriendships(Array.isArray(friendsRes) ? friendsRes : [])
    setConfirmedIds(new Set(confirmRes.data?.map((c: { proposal_id: string }) => c.proposal_id) ?? []))
    setMyLikes((myLikesRes.data ?? []).map((r: any) => ({ from_user_id: r.from_user_id, to_user_id: r.to_user_id, profile: r.profiles })))
    setLikesForMe((likesForMeRes.data ?? []).map((r: any) => ({ from_user_id: r.from_user_id, to_user_id: r.to_user_id, profile: r.profiles })))
    setLoading(false)

    // After recalculation finishes, reload proposals to catch newly created ones
    fetch('/api/proposals/recalculate', { method: 'POST' }).then(async r => {
      const { created } = await r.json().catch(() => ({ created: 0 }))
      if (created > 0) {
        // New proposals were created — reload
        const { data: newRaw } = await supabase.from('double_date_proposals')
          .select('*')
          .or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
        const newIds = [...new Set((newRaw ?? []).flatMap((p: any) => [p.guy1_id, p.guy2_id, p.girl1_id, p.girl2_id]))]
        if (newIds.length > 0) {
          const { data: newProfiles } = await supabase.from('profiles').select('id, name, age, photos, neighborhood, job, snapchat, instagram').in('id', newIds)
          const newMap = Object.fromEntries((newProfiles ?? []).map(p => [p.id, p]))
          setProposals((newRaw ?? []).map((p: any) => ({ ...p, guy1: newMap[p.guy1_id], guy2: newMap[p.guy2_id], girl1: newMap[p.girl1_id], girl2: newMap[p.girl2_id] })))
        }
      }
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function handle2Man(toUserId: string) {
    const supabase = createClient()
    await supabase.from('passes').delete().eq('from_user_id', userId!).eq('to_user_id', toUserId)
    await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_user_id: toUserId }),
    })
    load()
  }

  async function handlePass(toUserId: string) {
    const supabase = createClient()
    await supabase.from('passes').upsert({ from_user_id: userId!, to_user_id: toUserId })
    setLikesForMe(prev => prev.filter(l => l.from_user_id !== toUserId))
  }

  async function respondToFriendRequest(friendshipId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      if (action === 'accept') setFriendships(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
      else setFriendships(prev => prev.filter(f => f.id !== friendshipId))
    }
  }

  async function unfriend(friendshipId: string) {
    const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    if (res.ok) setFriendships(prev => prev.filter(f => f.id !== friendshipId))
  }

  const myLikedIds = new Set(myLikes.map(l => l.to_user_id))
  const likedMeIds = new Set(likesForMe.map(l => l.from_user_id))
  const proposalUserIds = new Set(proposals.flatMap(p => [p.guy1_id, p.guy2_id, p.girl1_id, p.girl2_id]))

  // Outgoing: I liked them
  const waitingOnThem = myLikes.filter(l => !likedMeIds.has(l.to_user_id) && !proposalUserIds.has(l.to_user_id))
  const mutualMatches = myLikes.filter(l => likedMeIds.has(l.to_user_id) && !proposalUserIds.has(l.to_user_id))
  // Incoming: they liked me, I haven't liked back and haven't passed
  const wantsToRunWith = likesForMe.filter(l => !myLikedIds.has(l.from_user_id))

  const pending = proposals.filter(p => p.status === 'pending')
  const confirmed = proposals.filter(p => p.status === 'confirmed')
  const incomingFriendRequests = friendships.filter(f => f.status === 'pending' && f.receiver_id === userId)
  const outgoingFriendRequests = friendships.filter(f => f.status === 'pending' && f.requester_id === userId)
  const acceptedFriends = friendships.filter(f => f.status === 'accepted')

  const datesCount = wantsToRunWith.length + mutualMatches.length + waitingOnThem.length + proposals.length
  const friendsNotifCount = incomingFriendRequests.length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-bold text-white">Dates & Friends</h1>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2D2D50' }}>
        <button onClick={() => setTab('dates')}
          className="flex-1 py-2.5 text-sm font-semibold transition-all"
          style={{ background: tab === 'dates' ? '#8B5CF6' : 'transparent', color: tab === 'dates' ? 'white' : '#6B7280' }}>
          Dates {datesCount > 0 ? `(${datesCount})` : ''}
        </button>
        <button onClick={() => setTab('friends')}
          className="flex-1 py-2.5 text-sm font-semibold transition-all relative"
          style={{ background: tab === 'friends' ? '#8B5CF6' : 'transparent', color: tab === 'friends' ? 'white' : '#6B7280' }}>
          Friends {acceptedFriends.length > 0 ? `(${acceptedFriends.length})` : ''}
          {friendsNotifCount > 0 && (
            <span className="absolute top-1.5 right-4 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: '#EC4899', color: 'white' }}>{friendsNotifCount}</span>
          )}
        </button>
      </div>

      {/* ── DATES TAB ── */}
      {tab === 'dates' && (
        <div className="flex flex-col gap-5">

          {/* Wants to 2Man with you */}
          {wantsToRunWith.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                Wants to 2Man with you ({wantsToRunWith.length})
              </h2>
              {wantsToRunWith.map(l => (
                <MiniCard key={l.from_user_id} profile={l.profile} status="incoming"
                  onAction={action => action === '2man' ? handle2Man(l.from_user_id) : handlePass(l.from_user_id)} />
              ))}
            </div>
          )}

          {/* Mutual matches */}
          {mutualMatches.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Heart size={16} className="text-pink-400" /> Matched ({mutualMatches.length})
              </h2>
              <p className="text-xs text-gray-500 -mt-2">You matched! Now you and a friend both need to match with two girls who are also friends.</p>
              {mutualMatches.map(l => (
                <MiniCard key={l.to_user_id} profile={l.profile} status="matched" />
              ))}
            </div>
          )}

          {/* Waiting on them */}
          {waitingOnThem.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-gray-400 text-sm">Waiting on their response ({waitingOnThem.length})</h2>
              {waitingOnThem.map(l => (
                <MiniCard key={l.to_user_id} profile={l.profile} status="waiting" />
              ))}
            </div>
          )}

          {/* Double date proposals */}
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Double Date Pending ({pending.length})
              </h2>
              {pending.map(p => <ProposalCard key={p.id} proposal={p} userId={userId!} hasConfirmed={confirmedIds.has(p.id)} />)}
            </div>
          )}
          {confirmed.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Heart size={18} className="text-pink-400" /> Confirmed Dates
              </h2>
              {confirmed.map(p => <ProposalCard key={p.id} proposal={p} userId={userId!} hasConfirmed={confirmedIds.has(p.id)} />)}
            </div>
          )}

          {datesCount === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="text-6xl">💕</div>
              <h2 className="text-xl font-bold text-white">No activity yet</h2>
              <p className="text-gray-400 text-sm">Head to Discover and hit 2Man on someone you like. Add friends so you can set up a double date.</p>
            </div>
          )}
        </div>
      )}

      {/* ── FRIENDS TAB ── */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-5">
          {incomingFriendRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                Follow Requests ({incomingFriendRequests.length})
              </h2>
              {incomingFriendRequests.map(f => {
                const them = f.requester
                return (
                  <div key={f.id} className="card p-3 flex items-center gap-3">
                    <Link href={`/profile/${them.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                        {them.photos?.[0] ? <img src={them.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm">{them.name}{them.age ? `, ${them.age}` : ''}</p>
                        {them.neighborhood && <p className="text-xs text-gray-500">{them.neighborhood}</p>}
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <button onClick={() => respondToFriendRequest(f.id, 'accept')}
                        className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#166534' }}>
                        <Check size={14} className="text-green-300" />
                      </button>
                      <button onClick={() => respondToFriendRequest(f.id, 'reject')}
                        className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#2D1515' }}>
                        <X size={14} className="text-red-300" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {acceptedFriends.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-purple-400" /> My Friends ({acceptedFriends.length})
              </h2>
              {acceptedFriends.map(f => {
                const them = f.requester_id === userId ? f.receiver : f.requester
                return (
                  <div key={f.id} className="card p-3 flex items-center gap-3">
                    <Link href={`/profile/${them.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                        {them.photos?.[0] ? <img src={them.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm">{them.name}{them.age ? `, ${them.age}` : ''}</p>
                        {them.neighborhood && <p className="text-xs text-gray-500">{them.neighborhood}</p>}
                      </div>
                    </Link>
                    <button onClick={() => unfriend(f.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#252540', color: '#9CA3AF', border: '1px solid #2D2D50' }}>
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {outgoingFriendRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-gray-500 text-sm">Sent Requests ({outgoingFriendRequests.length})</h2>
              {outgoingFriendRequests.map(f => {
                const them = f.receiver
                return (
                  <div key={f.id} className="card p-3 flex items-center gap-3 opacity-60">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                      {them.photos?.[0] ? <img src={them.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{them.name}</p>
                      <p className="text-xs text-gray-500">Waiting for response...</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {acceptedFriends.length === 0 && incomingFriendRequests.length === 0 && outgoingFriendRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="text-6xl">👥</div>
              <h2 className="text-xl font-bold text-white">No friends yet</h2>
              <p className="text-gray-400 text-sm">Search for your friends by name and send them a follow request.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
