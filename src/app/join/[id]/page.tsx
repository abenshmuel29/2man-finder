import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/signup?join=${id}`)
  }

  // Check group exists
  const { data: group } = await supabase
    .from('friend_groups')
    .select('id, name, gender')
    .eq('id', id)
    .single()

  if (!group) redirect('/groups')

  // Check if already a member
  const { data: existing } = await supabase
    .from('friend_group_members')
    .select('status')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  if (existing) redirect(`/groups/${id}`)

  // Check gender match
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, profile_complete')
    .eq('id', user.id)
    .single()

  if (!profile?.profile_complete) redirect(`/profile/setup?join=${id}`)

  if (profile.gender !== group.gender) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)' }}>
        <div className="card p-8 max-w-sm w-full text-center flex flex-col gap-4">
          <p className="text-2xl">🚫</p>
          <h1 className="text-xl font-bold text-white">Wrong group type</h1>
          <p className="text-gray-400 text-sm">This is a {group.gender} group and your profile is set to {profile.gender}.</p>
          <a href="/groups" className="btn-primary">Go to My Groups</a>
        </div>
      </div>
    )
  }

  // Auto-approve them into the group
  await supabase.from('friend_group_members').insert({
    group_id: id,
    user_id: user.id,
    status: 'approved',
    vote_count: 0,
  })

  redirect(`/groups/${id}`)
}
