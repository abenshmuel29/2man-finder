import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ dates: 0, friends: 0 })

  const [friendReqRes, likesForMeRes, proposalsRes, unreadMsgsRes] = await Promise.all([
    // Incoming friend requests
    supabase.from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending'),
    // People who liked me
    supabase.from('interests')
      .select('from_user_id', { count: 'exact', head: true })
      .eq('to_user_id', user.id),
    // 2Man confirmed groups
    supabase.from('double_date_proposals')
      .select('id', { count: 'exact', head: true })
      .or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
      .eq('status', 'confirmed'),
    // Unread messages
    supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null),
  ])

  return NextResponse.json({
    dates: (likesForMeRes.count ?? 0) + (proposalsRes.count ?? 0),
    friends: friendReqRes.count ?? 0,
    messages: unreadMsgsRes.count ?? 0,
  })
}
