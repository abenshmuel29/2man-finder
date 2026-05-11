'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, UserPlus } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  status: string
  vote_count: number
  profiles: { name: string | null; age: number | null; neighborhood: string | null; photos: string[] } | null
}

interface Props {
  group: { id: string; name: string; gender: string | null; creator_id: string }
  members: Member[]
  userId: string
  isMember: boolean
  isPending: boolean
  votesNeeded: number
  myVotedIds: string[]
  approvedCount: number
}

export default function GroupDetailClient({
  group, members, userId, isMember, isPending, votesNeeded, myVotedIds, approvedCount
}: Props) {
  const router = useRouter()
  const [votedIds, setVotedIds] = useState(new Set(myVotedIds))
  const [joining, setJoining] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  const approved = members.filter(m => m.status === 'approved')
  const pending = members.filter(m => m.status === 'pending')

  async function handleJoin() {
    setJoining(true)
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', group_id: group.id }),
    })
    router.refresh()
  }

  async function handleVote(candidateId: string) {
    const res = await fetch(`/api/groups/${group.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId }),
    })
    if (res.ok) {
      setVotedIds(prev => new Set([...prev, candidateId]))
      router.refresh()
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg('')
    const supabase = createClient()
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, gender')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!targetProfile) { setInviteMsg('No user found with that email.'); return }
    if (targetProfile.gender !== group.gender) { setInviteMsg(`This is a ${group.gender} group. You can only invite ${group.gender}s.`); return }

    const { error } = await supabase.from('friend_group_members').insert({
      group_id: group.id,
      user_id: targetProfile.id,
      status: 'pending',
      vote_count: 0,
      invited_by: userId,
    })
    if (error) setInviteMsg(error.message)
    else { setInviteMsg('Invite sent! They need 1/3 of members to approve.'); setEmail('') }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Join / status */}
      {!isMember && !isPending && (
        <button onClick={handleJoin} disabled={joining} className="btn-primary flex items-center justify-center gap-2">
          <UserPlus size={18} /> {joining ? 'Requesting...' : 'Request to Join'}
        </button>
      )}
      {isPending && (
        <div className="card p-4 text-center text-yellow-400 text-sm">
          ⏳ Your request is pending — 1/3 of members must approve you
        </div>
      )}

      {/* Approved members */}
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" /> Members ({approvedCount}/20)
        </h2>
        <div className="flex flex-col gap-2">
          {approved.map(m => {
            const p = m.profiles
            return (
              <div key={m.user_id} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{ background: '#252540' }}>
                  {p?.photos?.[0]
                    ? <img src={p.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">{group.gender === 'male' ? '👨' : '👩'}</div>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">{p?.name ?? 'Unknown'}{p?.age ? `, ${p.age}` : ''}</p>
                  {m.user_id === group.creator_id && <p className="text-xs text-purple-400">Group Creator</p>}
                  {m.user_id === userId && <p className="text-xs text-green-400">You</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending approvals */}
      {isMember && pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock size={16} className="text-yellow-400" /> Waiting for Approval
          </h2>
          <p className="text-xs text-gray-500">{votesNeeded} vote{votesNeeded !== 1 ? 's' : ''} needed to approve</p>
          <div className="flex flex-col gap-2">
            {pending.filter(m => m.user_id !== userId).map(m => {
              const p = m.profiles
              const hasVoted = votedIds.has(m.user_id)
              return (
                <div key={m.user_id} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
                    {p?.photos?.[0]
                      ? <img src={p.photos[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{p?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{m.vote_count}/{votesNeeded} votes</p>
                  </div>
                  {!hasVoted ? (
                    <button onClick={() => handleVote(m.user_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: '#8B5CF6', color: 'white' }}>
                      Approve
                    </button>
                  ) : (
                    <span className="text-xs text-green-400 font-medium">Voted ✓</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite section (members only) */}
      {isMember && approvedCount < 20 && (
        <div className="card p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-white">Invite Someone</h2>
          <p className="text-xs text-gray-500">Enter their email address — they must already have an account</p>
          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="friend@email.com" required />
            <button type="submit" className="btn-secondary">Send Invite</button>
          </form>
          {inviteMsg && <p className="text-sm text-yellow-400">{inviteMsg}</p>}
        </div>
      )}
    </div>
  )
}
