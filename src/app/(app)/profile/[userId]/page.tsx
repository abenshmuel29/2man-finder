import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NEIGHBORHOODS, BODY_TYPES } from '@/lib/types'
import Link from 'next/link'
import { MapPin, GraduationCap } from 'lucide-react'
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

  // Compute mutual friends
  const [{ data: myFriendships }, { data: theirFriendships }] = await Promise.all([
    supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted'),
    supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted'),
  ])
  const myFriendIds = new Set(
    (myFriendships ?? []).map((f: { requester_id: string; receiver_id: string }) =>
      f.requester_id === user.id ? f.receiver_id : f.requester_id
    )
  )
  const theirFriendIds = (theirFriendships ?? []).map((f: { requester_id: string; receiver_id: string }) =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  )
  const mutualIds = theirFriendIds.filter(id => myFriendIds.has(id))
  const mutualFriendCount = mutualIds.length

  // Fetch mutual friends' profiles for display
  let mutualFriendProfiles: { id: string; name: string | null; photos: string[] }[] = []
  if (mutualIds.length > 0) {
    const { data: mfp } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', mutualIds)
    mutualFriendProfiles = mfp ?? []
  }

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
        {profile.school && <Pill text={profile.school} icon={<GraduationCap size={12} />} />}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="card p-4">
          <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Friends you may like for a 2Man (only shown to opposite gender) */}
      <ProfileFriends profileId={userId} profileGender={profile.gender} />

      {/* Message button */}
      <Link href={`/messages/${userId}`} className="btn-primary text-center">
        Send a Message
      </Link>

      {/* Mutual friends */}
      {mutualFriendCount > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-semibold" style={{ color: '#C77DFF' }}>
            👥 {mutualFriendCount} mutual friend{mutualFriendCount !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {mutualFriendProfiles.map(f => (
              <div key={f.id} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full overflow-hidden"
                  style={{ background: '#13131F', border: '2px solid rgba(155,93,229,0.4)' }}>
                  {f.photos?.[0]
                    ? <img src={f.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm">👤</div>}
                </div>
                <p className="text-xs" style={{ color: '#7B7A96' }}>{f.name?.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
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

