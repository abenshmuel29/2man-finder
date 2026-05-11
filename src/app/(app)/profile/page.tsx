import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NEIGHBORHOODS, BODY_TYPES } from '@/lib/types'
import Link from 'next/link'
import { MapPin, Briefcase, GraduationCap, Edit } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.profile_complete) redirect('/profile/setup')

  const neighborhoodLabel = NEIGHBORHOODS.find(n => n.value === profile.neighborhood)?.label
  const bodyTypeLabel = BODY_TYPES.find(b => b.value === profile.body_type)?.label

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <Link href="/profile/setup" className="flex items-center gap-1 text-sm text-purple-400 font-medium">
          <Edit size={16} /> Edit
        </Link>
      </div>

      {/* Photos */}
      {profile.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {profile.photos.slice(0, 4).map((url: string, i: number) => (
            <div key={i} className={`rounded-xl overflow-hidden ${i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}>
              <img src={url} alt="profile photo" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Name & Basic */}
      <div className="card p-5 flex flex-col gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">{profile.name}, {profile.age}</h2>
          <p className="text-purple-400 capitalize">{profile.gender}</p>
        </div>
        {profile.bio && <p className="text-gray-300 text-sm">{profile.bio}</p>}
        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          {neighborhoodLabel && <span className="flex items-center gap-1"><MapPin size={14} />{neighborhoodLabel}</span>}
          {profile.job && <span className="flex items-center gap-1"><Briefcase size={14} />{profile.job}</span>}
          {profile.school && <span className="flex items-center gap-1"><GraduationCap size={14} />{profile.school}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="card p-5 flex flex-col gap-3">
        <h3 className="font-semibold text-white">Stats</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Height', value: profile.height },
            { label: 'Weight', value: profile.weight },
            { label: 'Body Type', value: bodyTypeLabel },
          ].filter(s => s.value).map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#252540' }}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {[
        { label: 'Sports', items: profile.sports },
        { label: 'Interests', items: profile.interests },
        { label: 'Hobbies', items: profile.hobbies },
      ].filter(g => g.items?.length > 0).map(group => (
        <div key={group.label} className="card p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-white">{group.label}</h3>
          <div className="flex flex-wrap gap-2">
            {group.items.map((tag: string) => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm"
                style={{ background: '#252540', border: '1px solid #2D2D50', color: '#C4B5FD' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Social (private) */}
      <div className="card p-5 flex flex-col gap-3">
        <h3 className="font-semibold text-white">Social Media <span className="text-xs text-gray-500">(shared only after a confirmed date)</span></h3>
        <div className="flex flex-col gap-2 text-sm">
          {profile.snapchat && <p className="text-gray-400">📸 Snapchat: <span className="text-white">{profile.snapchat}</span></p>}
          {profile.instagram && <p className="text-gray-400">📷 Instagram: <span className="text-white">@{profile.instagram}</span></p>}
        </div>
      </div>
    </div>
  )
}
