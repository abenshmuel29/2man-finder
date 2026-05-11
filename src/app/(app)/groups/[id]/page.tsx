import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GroupDetailClient from './GroupDetailClient'

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('friend_groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) redirect('/groups')

  const { data: members } = await supabase
    .from('friend_group_members')
    .select('*, profiles(*)')
    .eq('group_id', id)
    .order('created_at')

  const { data: myMembership } = await supabase
    .from('friend_group_members')
    .select('status')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  const approvedCount = members?.filter(m => m.status === 'approved').length ?? 0
  const votesNeeded = Math.max(1, Math.ceil(approvedCount / 3))

  // Votes I've already cast
  const { data: myVotes } = await supabase
    .from('friend_group_votes')
    .select('candidate_id')
    .eq('group_id', id)
    .eq('voter_id', user.id)

  const myVotedIds = new Set(myVotes?.map(v => v.candidate_id) ?? [])
  const isMember = myMembership?.status === 'approved'
  const isPending = myMembership?.status === 'pending'

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/groups" className="text-gray-400 hover:text-white">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{group.gender} group · {approvedCount} member{approvedCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {group.description && (
        <div className="card p-4">
          <p className="text-gray-300 text-sm">{group.description}</p>
        </div>
      )}

      <GroupDetailClient
        group={group}
        members={members ?? []}
        userId={user.id}
        isMember={isMember}
        isPending={isPending}
        votesNeeded={votesNeeded}
        myVotedIds={Array.from(myVotedIds)}
        approvedCount={approvedCount}
      />
    </div>
  )
}
