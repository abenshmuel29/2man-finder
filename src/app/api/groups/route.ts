import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.action === 'join') {
    const { group_id } = body

    // Check group gender matches user gender
    const [{ data: group }, { data: me }] = await Promise.all([
      supabase.from('friend_groups').select('gender').eq('id', group_id).single(),
      supabase.from('profiles').select('gender').eq('id', user.id).single(),
    ])

    if (!group || !me) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (group.gender !== me.gender) {
      return NextResponse.json({ error: `This is a ${group.gender} group` }, { status: 400 })
    }

    // Check member count
    const { count } = await supabase
      .from('friend_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .eq('status', 'approved')

    if ((count ?? 0) >= 20) return NextResponse.json({ error: 'Group is full (20 members max)' }, { status: 400 })

    const { error } = await supabase.from('friend_group_members').upsert({
      group_id,
      user_id: user.id,
      status: 'approved',
      vote_count: 0,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
