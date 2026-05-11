'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, UserPlus, Copy, Check } from 'lucide-react'

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
  group, members, userId, isMember, approvedCount
}: Props) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const approved = members.filter(m => m.status === 'approved')

  async function handleJoin() {
    setJoining(true)
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', group_id: group.id }),
    })
    router.refresh()
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${group.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Join button */}
      {!isMember && (
        <button onClick={handleJoin} disabled={joining} className="btn-primary flex items-center justify-center gap-2">
          <UserPlus size={18} /> {joining ? 'Joining...' : 'Join Group'}
        </button>
      )}

      {/* Members */}
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" /> Members ({approvedCount}/20)
        </h2>
        <div className="flex flex-col gap-2">
          {approved.map(m => {
            const p = m.profiles
            return (
              <div key={m.user_id} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
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

      {/* Invite via link */}
      {isMember && approvedCount < 20 && (
        <div className="card p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-white">Invite Friends</h2>
          <p className="text-xs text-gray-500">Share this link — they'll sign up and join instantly</p>
          <button onClick={copyInviteLink} className="btn-primary flex items-center justify-center gap-2">
            {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Invite Link</>}
          </button>
        </div>
      )}
    </div>
  )
}
