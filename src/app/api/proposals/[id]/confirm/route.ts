import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposal_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a participant
  const { data: proposal } = await supabase
    .from('double_date_proposals')
    .select('*')
    .eq('id', proposal_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = [proposal.guy1_id, proposal.guy2_id, proposal.girl1_id, proposal.girl2_id]
  if (!participants.includes(user.id)) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'Proposal is no longer pending' }, { status: 400 })
  }

  if (new Date(proposal.expires_at) < new Date()) {
    await supabase.from('double_date_proposals').update({ status: 'expired' }).eq('id', proposal_id)
    return NextResponse.json({ error: 'Proposal has expired' }, { status: 400 })
  }

  // Record confirmation
  const { error: confirmError } = await supabase.from('proposal_confirmations').upsert({
    proposal_id,
    user_id: user.id,
  })
  if (confirmError) return NextResponse.json({ error: confirmError.message }, { status: 500 })

  // Check if all 4 have confirmed
  const { count } = await supabase
    .from('proposal_confirmations')
    .select('*', { count: 'exact', head: true })
    .eq('proposal_id', proposal_id)

  if ((count ?? 0) >= 4) {
    await supabase.from('double_date_proposals').update({ status: 'confirmed' }).eq('id', proposal_id)

    // Exchange social media — fetch all 4 profiles' social info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, snapchat, instagram')
      .in('id', participants)

    return NextResponse.json({ confirmed: true, allConfirmed: true, profiles })
  }

  return NextResponse.json({ confirmed: true, allConfirmed: false, confirmCount: count })
}
