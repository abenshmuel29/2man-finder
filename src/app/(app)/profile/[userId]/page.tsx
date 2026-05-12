import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NEIGHBORHOODS, BODY_TYPES } from '@/lib/types'
import Link from 'next/link'
import { MapPin, Briefcase, GraduationCap } from 'lucide-react'
import BackButton from '@/components/BackButton'
import ProfileFriends from '@/components/ProfileFriends'

export default async function ViewProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Redirect to own profile page
  if (userId === user.id) redirect('/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('profile_complete', true)
    .single()

  if (!profile) redirect('/discover')

  const neighborhoodLabel = NEIGHBORHOODS.find(n => n.value === profile.neighborhood)?.label
  const bodyTypeLabel = BODY_TYPES.find(b => b.value === profile.body_type)?.label
  const tags = [...(profile.sports ?? []), ...(profile.interests ?? []), ...(profile.hobbies ?? [])]

  return (
    <div className="flex flex-col gap-5 py-2">
      <BackButton />

      {/* Photos */}
      {profile.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {profile.photos.map((url: string, i: number) => (
            <div key={i} className={`rounded-2xl overflow-hidden ${i === 0 && profile.photos.length % 2 !== 0 ? 'col-span-2' : ''}`}
              style={{ aspectRatio: i === 0 && profile.photos.length % 2 !== 0 ? '16/9' : '1/1' }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Name & basics */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-white">{profile.name}{profile.age ? `, ${profile.age}` : ''}</h1>
        {neighborhoodLabel && (
          <p className="text-gray-400 flex items-center gap-1.5 text-sm"><MapPin size={14} />{neighborhoodLabel}</p>
        )}
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        {profile.height && <Pill text={profile.height} />}
        {bodyTypeLabel && <Pill text={bodyTypeLabel} />}
        {profile.job && <Pill text={profile.job} icon={<Briefcase size={12} />} />}
        {profile.school && <Pill text={profile.school} icon={<GraduationCap size={12} />} />}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="card p-4">
          <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="card p-4 flex flex-col gap-3">
          {profile.sports?.length > 0 && <TagSection label="Sports" tags={profile.sports} />}
          {profile.interests?.length > 0 && <TagSection label="Interests" tags={profile.interests} />}
          {profile.hobbies?.length > 0 && <TagSection label="Hobbies" tags={profile.hobbies} />}
        </div>
      )}

      {/* Friends you may like for a 2Man (only shown to opposite gender) */}
      <ProfileFriends profileId={userId} profileGender={profile.gender} />

      {/* Message button */}
      <Link href={`/messages/${userId}`} className="btn-primary text-center">
        Send a Message
      </Link>
    </div>
  )
}

function Pill({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{ background: '#252540', border: '1px solid #2D2D50', color: '#D1D5DB' }}>
      {icon}{text}
    </span>
  )
}

function TagSection({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="px-3 py-1 rounded-full text-xs"
            style={{ background: '#1A1A2E', border: '1px solid #2D2D50', color: '#A78BFA' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
