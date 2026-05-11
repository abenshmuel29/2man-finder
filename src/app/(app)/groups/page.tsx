import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, CheckCircle, Clock } from 'lucide-react'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('gender, profile_complete').eq('id', user.id).single()
  if (!me?.profile_complete) redirect('/profile/setup')

  // My groups (approved)
  const { data: myMemberships } = await supabase
    .from('friend_group_members')
    .select('group_id, status, friend_groups(*)')
    .eq('user_id', user.id)
    .eq('status', 'approved')

  // Pending memberships (waiting for votes)
  const { data: pendingMemberships } = await supabase
    .from('friend_group_members')
    .select('group_id, vote_count, friend_groups(*)')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  // Groups where I need to vote on someone
  const { data: myGroupIds } = await supabase
    .from('friend_group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('status', 'approved')

  const approvedGroupIds = myGroupIds?.map(m => m.group_id) ?? []

  let pendingVotes: { candidate: { name: string }, group: { name: string, id: string }, voteCount: number, memberCount: number, groupId: string, candidateId: string }[] = []

  if (approvedGroupIds.length > 0) {
    const { data: pendingInMyGroups } = await supabase
      .from('friend_group_members')
      .select('group_id, user_id, vote_count, profiles(name), friend_groups(name, id)')
      .eq('status', 'pending')
      .in('group_id', approvedGroupIds)

    const { data: alreadyVoted } = await supabase
      .from('friend_group_votes')
      .select('candidate_id, group_id')
      .eq('voter_id', user.id)

    const votedSet = new Set((alreadyVoted ?? []).map(v => `${v.group_id}-${v.candidate_id}`))

    pendingVotes = (pendingInMyGroups ?? [])
      .filter(m => m.user_id !== user.id && !votedSet.has(`${m.group_id}-${m.user_id}`))
      .map(m => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        const group = Array.isArray(m.friend_groups) ? m.friend_groups[0] : m.friend_groups
        return {
          candidate: { name: profile?.name ?? 'Unknown' },
          group: { name: group?.name ?? '', id: group?.id ?? '' },
          voteCount: m.vote_count,
          memberCount: 0,
          groupId: m.group_id,
          candidateId: m.user_id,
        }
      })
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Friend Groups</h1>
          <p className="text-gray-500 text-sm">Your crew for double dates</p>
        </div>
        <Link href="/groups/create"
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: 'white' }}>
          <Plus size={16} /> New
        </Link>
      </div>

      {/* Pending votes notification */}
      {pendingVotes.length > 0 && (
        <div className="card p-4 flex flex-col gap-3" style={{ borderColor: '#F59E0B' }}>
          <p className="text-sm font-semibold text-yellow-400">⚡ Approval needed</p>
          {pendingVotes.map((pv, i) => (
            <VoteCard key={i} candidateName={pv.candidate.name} groupName={pv.group.name}
              groupId={pv.groupId} candidateId={pv.candidateId} voteCount={pv.voteCount} />
          ))}
        </div>
      )}

      {/* My groups */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><CheckCircle size={18} className="text-green-400" /> My Groups</h2>
        {myMemberships?.length === 0 && (
          <div className="card p-6 text-center flex flex-col items-center gap-3">
            <Users size={32} className="text-gray-600" />
            <p className="text-gray-400 text-sm">You&apos;re not in any groups yet.</p>
            <Link href="/groups/create" className="text-purple-400 text-sm font-semibold">Create your first group →</Link>
          </div>
        )}
        {myMemberships?.map(m => {
          const group = Array.isArray(m.friend_groups) ? m.friend_groups[0] : m.friend_groups as { id: string; name: string; description: string | null; gender: string | null } | null
          if (!group) return null
          return (
            <Link key={m.group_id} href={`/groups/${m.group_id}`} className="card p-4 flex items-center justify-between hover:border-purple-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                  {group.gender === 'male' ? '👨' : '👩'}
                </div>
                <div>
                  <p className="font-semibold text-white">{group.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{group.gender} group</p>
                </div>
              </div>
              <span className="text-gray-600 text-lg">›</span>
            </Link>
          )
        })}
      </div>

      {/* Pending memberships */}
      {pendingMemberships && pendingMemberships.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Clock size={18} className="text-yellow-400" /> Awaiting Approval</h2>
          {pendingMemberships.map(m => {
            const group = Array.isArray(m.friend_groups) ? m.friend_groups[0] : m.friend_groups as { name: string } | null
            return (
              <div key={m.group_id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#252540' }}>⏳</div>
                <div>
                  <p className="font-medium text-white">{group?.name}</p>
                  <p className="text-xs text-gray-500">{m.vote_count} votes received — waiting for 1/3 approval</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VoteCard({ candidateName, groupName, groupId, candidateId, voteCount }: {
  candidateName: string; groupName: string; groupId: string; candidateId: string; voteCount: number
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white font-medium">{candidateName} wants to join <span className="text-purple-400">{groupName}</span></p>
        <p className="text-xs text-gray-500">{voteCount} vote(s) so far</p>
      </div>
      <Link href={`/groups/${groupId}`}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: '#F59E0B', color: '#0D0D1A' }}>
        Vote
      </Link>
    </div>
  )
}
