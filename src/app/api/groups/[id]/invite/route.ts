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

  const { user_id: target_user_id } = await request.json()
  if (!target_user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  // Verify inviter is an approved member
  const { data: membership } = await supabase
    .from('friend_group_members')
    .select('status')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .single()

  if (!membership) return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })

  // Check gender match
  const [{ data: group }, { data: targetProfile }] = await Promise.all([
    supabase.from('friend_groups').select('gender').eq('id', group_id).single(),
    supabase.from('profiles').select('gender').eq('id', target_user_id).single(),
  ])

  if (!group || !targetProfile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (group.gender !== targetProfile.gender) {
    return NextResponse.json({ error: 'Gender mismatch' }, { status: 400 })
  }

  // Check group capacity
  const { count } = await supabase
    .from('friend_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group_id)
    .eq('status', 'approved')

  if ((count ?? 0) >= 20) return NextResponse.json({ error: 'Group is full' }, { status: 400 })

  // Auto-approve them into the group
  const { error } = await supabase.from('friend_group_members').upsert({
    group_id,
    user_id: target_user_id,
    status: 'approved',
    vote_count: 0,
    invited_by: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
