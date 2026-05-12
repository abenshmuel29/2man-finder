import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getAcceptedFriends(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted')
  return (data ?? []).map((f: { requester_id: string; receiver_id: string }) =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  )
}

async function hasMutualLike(supabase: Awaited<ReturnType<typeof createClient>>, a: string, b: string): Promise<boolean> {
  const [{ data: aToB }, { data: bToA }] = await Promise.all([
    supabase.from('interests').select('id').eq('from_user_id', a).eq('to_user_id', b).single(),
    supabase.from('interests').select('id').eq('from_user_id', b).eq('to_user_id', a).single(),
  ])
  return !!(aToB && bToA)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_user_id } = await request.json()
  if (!to_user_id) return NextResponse.json({ error: 'Missing to_user_id' }, { status: 400 })

  const { error } = await supabase.from('interests').upsert({ from_user_id: user.id, to_user_id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check for mutual match
  const { data: mutual } = await supabase
    .from('interests').select('id')
    .eq('from_user_id', to_user_id).eq('to_user_id', user.id).single()

  if (!mutual) return NextResponse.json({ mutual: false })

  const { data: profiles } = await supabase
    .from('profiles').select('id, gender').in('id', [user.id, to_user_id])
  if (!profiles || profiles.length !== 2) return NextResponse.json({ mutual: true })

  const me = profiles.find(p => p.id === user.id)
  const them = profiles.find(p => p.id === to_user_id)
  if (!me || !them || me.gender === them.gender) return NextResponse.json({ mutual: true })

  const guyId = me.gender === 'male' ? user.id : to_user_id
  const girlId = me.gender === 'female' ? user.id : to_user_id

  // Find all accepted friends of both
  const [guyFriends, girlFriends] = await Promise.all([
    getAcceptedFriends(supabase, guyId),
    getAcceptedFriends(supabase, girlId),
  ])

  // Check every (guyFriend, girlFriend) pair for mutual like → create proposal
  const proposals: Array<{ guy1_id: string; guy2_id: string; girl1_id: string; girl2_id: string; status: string; expires_at: string }> = []

  for (const guyFriend of guyFriends) {
    for (const girlFriend of girlFriends) {
      if (await hasMutualLike(supabase, guyFriend, girlFriend)) {
        // Check proposal doesn't already exist
        const { data: existing } = await supabase
          .from('double_date_proposals').select('id')
          .or(`and(guy1_id.eq.${guyId},guy2_id.eq.${guyFriend},girl1_id.eq.${girlId},girl2_id.eq.${girlFriend}),and(guy1_id.eq.${guyFriend},guy2_id.eq.${guyId},girl1_id.eq.${girlFriend},girl2_id.eq.${girlId})`)
          .single()
        if (!existing) {
          proposals.push({
            guy1_id: guyId, guy2_id: guyFriend,
            girl1_id: girlId, girl2_id: girlFriend,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
        }
      }
    }
  }

  if (proposals.length > 0) {
    await supabase.from('double_date_proposals').insert(proposals)
  }

  return NextResponse.json({ mutual: true, proposals: proposals.length })
}
