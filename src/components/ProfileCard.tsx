'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { type Profile, NEIGHBORHOODS, BODY_TYPES } from '@/lib/types'
import { MapPin, Briefcase, GraduationCap, Heart, X } from 'lucide-react'

interface Props {
  profile: Profile
  onNext: () => void
}

export default function ProfileCard({ profile, onNext }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  const neighborhoodLabel = NEIGHBORHOODS.find(n => n.value === profile.neighborhood)?.label
  const bodyTypeLabel = BODY_TYPES.find(b => b.value === profile.body_type)?.label

  async function handleAction(action: 'like' | 'pass') {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (action === 'like') {
      await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_user_id: profile.id }),
      })
    } else {
      await supabase.from('passes').upsert({ from_user_id: user.id, to_user_id: profile.id })
    }
    setLoading(false)
    setPhotoIndex(0)
    onNext()
    router.refresh()
  }

  return (
    <div className="card overflow-hidden">
      {/* Photos */}
      {profile.photos?.length > 0 ? (
        <div className="relative aspect-[4/5] bg-gray-900">
          <img
            src={profile.photos[photoIndex]}
            alt={profile.name ?? ''}
            className="w-full h-full object-cover"
          />
          {/* Photo dots */}
          {profile.photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5">
              {profile.photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIndex(i)}
                  className="h-1 rounded-full transition-all"
                  style={{ width: i === photoIndex ? '24px' : '8px', background: i === photoIndex ? 'white' : 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          )}
          {/* Photo nav */}
          {profile.photos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/2" onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} />
              <button className="absolute right-0 top-0 bottom-0 w-1/2" onClick={() => setPhotoIndex(i => Math.min(profile.photos.length - 1, i + 1))} />
            </>
          )}
          {/* Gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-40"
            style={{ background: 'linear-gradient(to top, rgba(13,13,26,1) 0%, transparent 100%)' }} />
          <div className="absolute bottom-4 left-5">
            <h2 className="text-2xl font-bold text-white">{profile.name}, {profile.age}</h2>
            {neighborhoodLabel && (
              <p className="text-gray-300 text-sm flex items-center gap-1"><MapPin size={12} />{neighborhoodLabel}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-[4/5] flex items-center justify-center text-6xl"
          style={{ background: 'linear-gradient(135deg, #1A1A2E, #252540)' }}>
          {profile.gender === 'male' ? '👨' : '👩'}
        </div>
      )}

      {/* Info */}
      <div className="p-5 flex flex-col gap-4">
        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          {profile.height && <Pill text={profile.height} />}
          {bodyTypeLabel && <Pill text={bodyTypeLabel} />}
          {profile.job && <Pill text={profile.job} icon={<Briefcase size={12} />} />}
          {profile.school && <Pill text={profile.school} icon={<GraduationCap size={12} />} />}
        </div>

        {profile.bio && <p className="text-gray-300 text-sm">{profile.bio}</p>}

        {/* Tags */}
        {[...( profile.sports ?? []), ...(profile.interests ?? []), ...(profile.hobbies ?? [])].slice(0, 8).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...(profile.sports ?? []), ...(profile.interests ?? []), ...(profile.hobbies ?? [])].slice(0, 8).map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs"
                style={{ background: '#252540', border: '1px solid #2D2D50', color: '#A78BFA' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 mt-2">
          <button onClick={() => handleAction('pass')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all"
            style={{ background: '#252540', border: '1px solid #2D2D50', color: '#9CA3AF' }}>
            <X size={22} /> Pass
          </button>
          <button onClick={() => handleAction('like')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white' }}>
            <Heart size={22} /> 2Man
          </button>
        </div>
      </div>
    </div>
  )
}

function Pill({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
      style={{ background: '#252540', border: '1px solid #2D2D50', color: '#D1D5DB' }}>
      {icon}{text}
    </span>
  )
}
