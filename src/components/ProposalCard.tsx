'use client'

import Link from 'next/link'

interface MiniProfile {
  id: string
  name: string | null
  age: number | null
  photos: string[]
  neighborhood: string | null
  job: string | null
  snapchat?: string | null
  instagram?: string | null
}

interface Proposal {
  id: string
  guy1_id: string
  guy2_id: string
  girl1_id: string
  girl2_id: string
  status: string
  guy1: MiniProfile
  guy2: MiniProfile
  girl1: MiniProfile
  girl2: MiniProfile
}

interface Props {
  proposal: Proposal
  userId: string
}

export default function ProposalCard({ proposal, userId }: Props) {
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

  const others = [proposal.guy1, proposal.guy2, proposal.girl1, proposal.girl2].filter(p => p?.id !== userId)

  function Avatar({ profile, label }: { profile: MiniProfile; label: string }) {
    return (
      <Link href={`/profile/${profile.id}`} className="flex flex-col items-center gap-1 flex-1">
        <div className="w-14 h-14 rounded-full overflow-hidden" style={{ background: '#252540', border: '2px solid #8B5CF6' }}>
          {profile.photos?.[0]
            ? <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
        </div>
        <p className="text-xs font-medium text-white text-center leading-tight">{profile.name?.split(' ')[0]}</p>
        {profile.age && <p className="text-xs text-gray-500">{profile.age}</p>}
        <p className="text-xs text-purple-400">{label}</p>
      </Link>
    )
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🎉</span>
        <div>
          <p className="font-bold text-white">2Man Confirmed!</p>
          <p className="text-xs text-gray-400">Your double date is ready to go</p>
        </div>
      </div>

      {/* The four people */}
      <div className="flex items-center gap-2">
        <Avatar profile={proposal.guy1} label="Guy 1" />
        <div className="flex flex-col items-center gap-1">
          <div className="text-pink-400">❤️</div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="text-pink-400">❤️</div>
        </div>
        <Avatar profile={proposal.girl1} label="Girl 1" />
        <div className="text-gray-600 text-lg font-light">+</div>
        <Avatar profile={proposal.guy2} label="Guy 2" />
        <div className="flex flex-col items-center gap-1">
          <div className="text-pink-400">❤️</div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="text-pink-400">❤️</div>
        </div>
        <Avatar profile={proposal.girl2} label="Girl 2" />
      </div>

      {/* Your pairing summary */}
      <div className="rounded-lg p-3 text-sm text-gray-400" style={{ background: '#252540' }}>
        <p><span className="text-white font-medium">Your date:</span> {myDate?.name}</p>
        <p><span className="text-white font-medium">Your friend going:</span> {myFriend?.name}</p>
        <p><span className="text-white font-medium">Their date:</span> {friendsDate?.name}</p>
      </div>

      {/* Socials unlocked */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))', border: '1px solid #8B5CF6' }}>
        <p className="text-sm font-bold text-white">🔓 Socials Unlocked</p>
        {others.map(p => p && (
          <div key={p.id} className="rounded-lg p-3 flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-white font-semibold text-sm">{p.name}{p.age ? `, ${p.age}` : ''}</p>
            {p.snapchat
              ? <p className="text-sm text-yellow-300">📸 Snap: <span className="font-medium">{p.snapchat}</span></p>
              : null}
            {p.instagram
              ? <p className="text-sm text-pink-300">📷 IG: <span className="font-medium">@{p.instagram}</span></p>
              : null}
            {!p.snapchat && !p.instagram && (
              <p className="text-xs text-gray-500">No socials added</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
