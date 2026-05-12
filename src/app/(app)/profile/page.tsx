import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NEIGHBORHOODS, BODY_TYPES } from '@/lib/types'
import Link from 'next/link'
import { MapPin, Briefcase, GraduationCap, Edit } from 'lucide-react'

interface MiniProfile {
  id: string
  name: string | null
  photos: string[]
  gender: string | null
}

interface Proposal {
  id: string
  guy1_id: string
  guy2_id: string
  girl1_id: string
  girl2_id: string
  created_at: string
  guy1: MiniProfile
  guy2: MiniProfile
  girl1: MiniProfile
  girl2: MiniProfile
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.profile_complete) redirect('/profile/setup')

  const neighborhoodLabel = NEIGHBORHOODS.find(n => n.value === profile.neighborhood)?.label
  const bodyTypeLabel = BODY_TYPES.find(b => b.value === profile.body_type)?.label

  // Fetch confirmed 2Man history for this user
  const { data: rawProposals } = await supabase
    .from('double_date_proposals')
    .select(`
      id, guy1_id, guy2_id, girl1_id, girl2_id, created_at,
      guy1:profiles!double_date_proposals_guy1_id_fkey(id, name, photos, gender),
      guy2:profiles!double_date_proposals_guy2_id_fkey(id, name, photos, gender),
      girl1:profiles!double_date_proposals_girl1_id_fkey(id, name, photos, gender),
      girl2:profiles!double_date_proposals_girl2_id_fkey(id, name, photos, gender)
    `)
    .or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  const proposals: Proposal[] = (rawProposals ?? []).map((p: any) => ({
    id: p.id,
    guy1_id: p.guy1_id,
    guy2_id: p.guy2_id,
    girl1_id: p.girl1_id,
    girl2_id: p.girl2_id,
    created_at: p.created_at,
    guy1: Array.isArray(p.guy1) ? p.guy1[0] : p.guy1,
    guy2: Array.isArray(p.guy2) ? p.guy2[0] : p.guy2,
    girl1: Array.isArray(p.girl1) ? p.girl1[0] : p.girl1,
    girl2: Array.isArray(p.girl2) ? p.girl2[0] : p.girl2,
  }))

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 26, lineHeight: 1.3 }}>My Profile</h1>
        <Link href="/profile/setup" className="flex items-center gap-1 text-sm font-medium"
          style={{ color: '#9B5DE5' }}>
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
          <p style={{ color: '#9B5DE5' }} className="capitalize">{profile.gender}</p>
        </div>
        {profile.bio && <p className="text-sm" style={{ color: '#c0bfd4', lineHeight: 1.6 }}>{profile.bio}</p>}
        <div className="flex flex-wrap gap-3 text-sm" style={{ color: '#7B7A96' }}>
          {neighborhoodLabel && <span className="flex items-center gap-1"><MapPin size={14} />{neighborhoodLabel}</span>}
          {profile.job && <span className="flex items-center gap-1"><Briefcase size={14} />{profile.job}</span>}
          {profile.school && <span className="flex items-center gap-1"><GraduationCap size={14} />{profile.school}</span>}
        </div>
      </div>

      {/* Stats */}
      {[profile.height, profile.weight, bodyTypeLabel].some(Boolean) && (
        <div className="card p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-white">Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Height', value: profile.height },
              { label: 'Weight', value: profile.weight },
              { label: 'Body Type', value: bodyTypeLabel },
            ].filter(s => s.value).map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#252540' }}>
                <p className="text-xs mb-1" style={{ color: '#7B7A96' }}>{s.label}</p>
                <p className="text-sm font-semibold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                style={{ background: '#252540', border: '1px solid rgba(155,93,229,0.2)', color: '#C77DFF' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Social (private) */}
      <div className="card p-5 flex flex-col gap-3">
        <h3 className="font-semibold text-white">
          Social Media{' '}
          <span className="text-xs font-normal" style={{ color: '#7B7A96' }}>(shared only after a confirmed 2Man)</span>
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          {profile.snapchat && <p style={{ color: '#7B7A96' }}>📸 Snapchat: <span className="text-white">{profile.snapchat}</span></p>}
          {profile.instagram && <p style={{ color: '#7B7A96' }}>📷 Instagram: <span className="text-white">@{profile.instagram}</span></p>}
          {!profile.snapchat && !profile.instagram && (
            <p style={{ color: '#4B5563', fontSize: 13 }}>No socials added yet.</p>
          )}
        </div>
      </div>

      {/* ── 2Man History (only visible to self) ── */}
      <div className="card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>🎉</span>
          <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>
            2Man History
          </h3>
          {proposals.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#FF4D6D,#9B5DE5)', color: 'white' }}>
              {proposals.length}
            </span>
          )}
        </div>

        {proposals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span style={{ fontSize: 36 }}>👀</span>
            <p style={{ color: '#7B7A96', fontSize: 13, lineHeight: 1.6 }}>
              No confirmed 2Mans yet — keep swiping!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {proposals.map(p => {
              const myRole = p.guy1_id === user.id ? 'guy1'
                : p.guy2_id === user.id ? 'guy2'
                : p.girl1_id === user.id ? 'girl1' : 'girl2'
              const myDate = myRole === 'guy1' ? p.girl1
                : myRole === 'guy2' ? p.girl2
                : myRole === 'girl1' ? p.guy1 : p.guy2
              const myFriend = myRole === 'guy1' ? p.guy2
                : myRole === 'guy2' ? p.guy1
                : myRole === 'girl1' ? p.girl2 : p.girl1
              const friendDate = myRole === 'guy1' ? p.girl2
                : myRole === 'guy2' ? p.girl1
                : myRole === 'girl1' ? p.guy2 : p.guy1
              const all = [p.guy1, p.guy2, p.girl1, p.girl2].filter(Boolean)
              const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <div key={p.id} className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)' }}>
                  {/* Date */}
                  <p className="text-xs" style={{ color: '#7B7A96' }}>{date}</p>

                  {/* Avatar row */}
                  <div className="flex gap-2">
                    {all.map(person => person && (
                      <div key={person.id} className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden"
                          style={{ background: '#13131F', border: `2px solid ${person.id === user.id ? '#FF4D6D' : 'rgba(255,255,255,0.1)'}` }}>
                          {person.photos?.[0]
                            ? <img src={person.photos[0]} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">
                                {person.gender === 'male' ? '👨' : '👩'}
                              </div>}
                        </div>
                        <p className="text-xs text-center font-medium leading-tight"
                          style={{ color: person.id === user.id ? '#FF6B9D' : '#c0bfd4' }}>
                          {person.name?.split(' ')[0]}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <p style={{ fontSize: 12, color: '#7B7A96', lineHeight: 1.6 }}>
                    You went on a 2Man with{' '}
                    <span style={{ color: '#FF6B9D', fontWeight: 600 }}>{myDate?.name?.split(' ')[0]}</span>
                    {' '}alongside{' '}
                    <span style={{ color: '#C77DFF', fontWeight: 600 }}>{myFriend?.name?.split(' ')[0]}</span>
                    {' '}&{' '}
                    <span style={{ color: '#C77DFF', fontWeight: 600 }}>{friendDate?.name?.split(' ')[0]}</span>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
