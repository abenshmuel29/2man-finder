import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('friendships')
    .select('id, status, requester_id, receiver_id, created_at, requester:profiles!friendships_requester_id_fkey(id, name, age, photos, neighborhood), receiver:profiles!friendships_receiver_id_fkey(id, name, age, photos, neighborhood)')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiver_id } = await request.json()
  if (!receiver_id) return NextResponse.json({ error: 'Missing receiver_id' }, { status: 400 })

  // Verify same gender
  const [{ data: me }, { data: them }] = await Promise.all([
    supabase.from('profiles').select('gender').eq('id', user.id).single(),
    supabase.from('profiles').select('gender').eq('id', receiver_id).single(),
  ])

  if (!me || !them) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (me.gender !== them.gender) return NextResponse.json({ error: 'Can only follow same gender' }, { status: 400 })

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    receiver_id,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
