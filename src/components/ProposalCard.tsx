'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Clock, CheckCircle, Share2 } from 'lucide-react'

interface MiniProfile {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  neighborhood: string | null
  job: string | null
}

interface Proposal {
  id: string
  guy1_id: string
  guy2_id: string
  girl1_id: string
  girl2_id: string
  status: string
  expires_at: string
  guy1: MiniProfile
  guy2: MiniProfile
  girl1: MiniProfile
  girl2: MiniProfile
}

interface Props {
  proposal: Proposal
  userId: string
  hasConfirmed: boolean
}

export default function ProposalCard({ proposal, userId, hasConfirmed }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(hasConfirmed)

  const isPending = proposal.status === 'pending'
  const isConfirmed = proposal.status === 'confirmed'
  const timeLeft = isPending ? formatDistanceToNow(new Date(proposal.expires_at), { addSuffix: true }) : null

  // Figure out my pair partner
  const myRole = proposal.guy1_id === userId ? 'guy1'
    : proposal.guy2_id === userId ? 'guy2'
    : proposal.girl1_id === userId ? 'girl1' : 'girl2'

  const myDate = myRole === 'guy1' ? proposal.girl1
    : myRole === 'guy2' ? proposal.girl2
    : myRole === 'girl1' ? proposal.guy1 : proposal.guy2

  const myFriend = myRole === 'guy1' ? proposal.guy2
    : myRole === 'guy2' ? proposal.guy1
    : myRole === 'girl1' ? proposal.girl2 : proposal.girl1

  const friendsDate = myRole === 'guy1' ? proposal.girl2
    : myRole === 'guy2' ? proposal.girl1
    : myRole === 'girl1' ? proposal.guy2 : proposal.guy1

  async function handleConfirm() {
    setConfirming(true)
    const res = await fetch(`/api/proposals/${proposal.id}/confirm`, { method: 'POST' })
    if (res.ok) {
      setConfirmed(true)
      router.refresh()
    }
    setConfirming(false)
  }

  function MiniAvatar({ profile, label }: { profile: MiniProfile; label: string }) {
    return (
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="w-16 h-16 rounded-full overflow-hidden" style={{ background: '#252540', border: '2px solid #2D2D50' }}>
          {profile.photos?.[0]
            ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
        </div>
        <p className="text-xs font-medium text-white text-center">{profile.name?.split(' ')[0]}</p>
        {profile.age && <p className="text-xs text-gray-500">{profile.age}</p>}
        <p className="text-xs text-purple-400">{label}</p>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium">
            <Clock size={13} /> Expires {timeLeft}
          </span>
        )}
        {isConfirmed && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <CheckCircle size={13} /> Double Date Confirmed!
          </span>
        )}
        {proposal.status === 'expired' && (
          <span className="text-xs text-gray-500">Expired</span>
        )}
      </div>

      {/* The four people */}
      <div className="flex items-center gap-2">
        <MiniAvatar profile={proposal.guy1} label="Guy 1" />
        <div className="flex flex-col items-center">
          <div className="text-pink-400 text-xl">❤️</div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="text-pink-400 text-xl">❤️</div>
        </div>
        <MiniAvatar profile={proposal.girl1} label="Girl 1" />
        <div className="w-6 flex items-center justify-center text-gray-600">+</div>
        <MiniAvatar profile={proposal.guy2} label="Guy 2" />
        <div className="flex flex-col items-center">
          <div className="text-pink-400 text-xl">❤️</div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="text-pink-400 text-xl">❤️</div>
        </div>
        <MiniAvatar profile={proposal.girl2} label="Girl 2" />
      </div>

      <div className="rounded-lg p-3 text-sm text-gray-400" style={{ background: '#252540' }}>
        <p><span className="text-white font-medium">Your date:</span> {myDate.name}</p>
        <p><span className="text-white font-medium">Your friend:</span> {myFriend.name}</p>
        <p><span className="text-white font-medium">Their date:</span> {friendsDate.name}</p>
      </div>

      {/* Confirmed: show social media */}
      {isConfirmed && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))', border: '1px solid #8B5CF6' }}>
          <p className="text-sm font-semibold text-white">🎉 Connect with your dates!</p>
          {[proposal.guy1, proposal.guy2, proposal.girl1, proposal.girl2]
            .filter(p => p.id !== userId)
            .map(p => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-white font-medium">{p.name}:</span>
                <span className="text-purple-300 flex items-center gap-1">
                  <Share2 size={13} /> Connect via social
                </span>
              </div>
            ))}
          <p className="text-xs text-gray-400">Snap & Instagram handles were exchanged — check your DMs!</p>
        </div>
      )}

      {/* Confirm button */}
      {isPending && !confirmed && (
        <button onClick={handleConfirm} disabled={confirming} className="btn-primary">
          {confirming ? 'Confirming...' : '✅ Confirm Double Date'}
        </button>
      )}

      {isPending && confirmed && (
        <div className="rounded-xl p-3 text-center text-sm text-green-400 font-medium"
          style={{ background: '#0F2A1E', border: '1px solid #166534' }}>
          ✓ You confirmed! Waiting for the others...
        </div>
      )}
    </div>
  )
}
