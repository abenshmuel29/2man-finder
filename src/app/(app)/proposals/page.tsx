'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProposalCard from '@/components/ProposalCard'
import { Heart, Users, Check, X, UserMinus } from 'lucide-react'

interface MiniProfile {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  neighborhood: string | null
}

interface Friendship {
  id: string
  status: string
  requester_id: string
  receiver_id: string
  requester: MiniProfile
  receiver: MiniProfile
}

export default function DatesAndFriendsPage() {
  const [tab, setTab] = useState<'dates' | 'friends'>('dates')
  const [userId, setUserId] = useState<string | null>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [proposalsRes, friendsRes, confirmRes] = await Promise.all([
        supabase.from('double_date_proposals').select(`
          *,
          guy1:profiles!double_date_proposals_guy1_id_fkey(id, name, age, photos, neighborhood, job),
          guy2:profiles!double_date_proposals_guy2_id_fkey(id, name, age, photos, neighborhood, job),
          girl1:profiles!double_date_proposals_girl1_id_fkey(id, name, age, photos, neighborhood, job),
          girl2:profiles!double_date_proposals_girl2_id_fkey(id, name, age, photos, neighborhood, job)
        `).or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
          .order('created_at', { ascending: false }),
        fetch('/api/friends').then(r => r.json()),
        supabase.from('proposal_confirmations').select('proposal_id').eq('user_id', user.id),
      ])

      setProposals(proposalsRes.data ?? [])
      setFriendships(Array.isArray(friendsRes) ? friendsRes : [])
      setConfirmedIds(new Set(confirmRes.data?.map((c: { proposal_id: string }) => c.proposal_id) ?? []))
      setLoading(false)
    }
    load()
  }, [])

  async function respondToRequest(friendshipId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      if (action === 'accept') {
        setFriendships(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f))
      } else {
        setFriendships(prev => prev.filter(f => f.id !== friendshipId))
      }
    }
  }

  async function unfriend(friendshipId: string) {
    const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    if (res.ok) setFriendships(prev => prev.filter(f => f.id !== friendshipId))
  }

  const pending = proposals.filter(p => p.status === 'pending')
  const confirmed = proposals.filter(p => p.status === 'confirmed')
  const incomingRequests = friendships.filter(f => f.status === 'pending' && f.receiver_id === userId)
  const outgoingRequests = friendships.filter(f => f.status === 'pending' && f.requester_id === userId)
  const acceptedFriends = friendships.filter(f => f.status === 'accepted')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <h1 className="text-2xl font-bold text-white">Dates & Friends</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2D2D50' }}>
        {(['dates', 'friends'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all"
            style={{ background: tab === t ? '#8B5CF6' : 'transparent', color: tab === t ? 'white' : '#6B7280' }}>
            {t === 'dates' ? `Dates ${proposals.length > 0 ? `(${proposals.length})` : ''}` : `Friends ${acceptedFriends.length > 0 ? `(${acceptedFriends.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Dates tab */}
      {tab === 'dates' && (
        <div className="flex flex-col gap-4">
          {proposals.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="text-6xl">💕</div>
              <h2 className="text-xl font-bold text-white">No proposals yet</h2>
              <p className="text-gray-400 text-sm">Add friends, like people in Discover — when two pairs of friends mutually match, a double date is proposed!</p>
            </div>
          )}
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Pending ({pending.length})
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
        </div>
      )}

      {/* Friends tab */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-5">
          {/* Incoming requests */}
          {incomingRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                Follow Requests ({incomingRequests.length})
              </h2>
              {incomingRequests.map(f => {
                const them = f.requester
                return (
                  <div key={f.id} className="card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                      {them.photos?.[0] ? <img src={them.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{them.name}{them.age ? `, ${them.age}` : ''}</p>
                      {them.neighborhood && <p className="text-xs text-gray-500">{them.neighborhood}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondToRequest(f.id, 'accept')}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: '#166534' }}>
                        <Check size={14} className="text-green-300" />
                      </button>
                      <button onClick={() => respondToRequest(f.id, 'reject')}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: '#2D1515' }}>
                        <X size={14} className="text-red-300" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Accepted friends */}
          {acceptedFriends.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-purple-400" /> My Friends ({acceptedFriends.length})
              </h2>
              {acceptedFriends.map(f => {
                const them = f.requester_id === userId ? f.receiver : f.requester
                return (
                  <div key={f.id} className="card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                      {them.photos?.[0] ? <img src={them.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{them.name}{them.age ? `, ${them.age}` : ''}</p>
                      {them.neighborhood && <p className="text-xs text-gray-500">{them.neighborhood}</p>}
                    </div>
                    <button onClick={() => unfriend(f.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: '#252540' }}>
                      <UserMinus size={14} className="text-gray-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Outgoing requests */}
          {outgoingRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-gray-500 text-sm">Sent Requests ({outgoingRequests.length})</h2>
              {outgoingRequests.map(f => {
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

          {acceptedFriends.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0 && (
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
