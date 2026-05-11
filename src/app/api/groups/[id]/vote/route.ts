import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: group_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidate_id } = await request.json()

  // Verify voter is an approved member
  const { data: voterMembership } = await supabase
    .from('friend_group_members')
    .select('status')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .single()

  if (voterMembership?.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved members can vote' }, { status: 403 })
  }

  // Record vote (upsert prevents double voting)
  const { error: voteError } = await supabase.from('friend_group_votes').insert({
    group_id,
    candidate_id,
    voter_id: user.id,
  })

  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 })

  // Count votes and update member's vote_count
  const { count: voteCount } = await supabase
    .from('friend_group_votes')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group_id)
    .eq('candidate_id', candidate_id)

  const { count: approvedCount } = await supabase
    .from('friend_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group_id)
    .eq('status', 'approved')

  const votesNeeded = Math.max(1, Math.ceil((approvedCount ?? 1) / 3))
  const currentVotes = voteCount ?? 0
  const shouldApprove = currentVotes >= votesNeeded

  await supabase
    .from('friend_group_members')
    .update({ vote_count: currentVotes, status: shouldApprove ? 'approved' : 'pending' })
    .eq('group_id', group_id)
    .eq('user_id', candidate_id)

  return NextResponse.json({ approved: shouldApprove, votes: currentVotes, needed: votesNeeded })
}
