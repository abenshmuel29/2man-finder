import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function getAcceptedFriends(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted')
  return (data ?? []).map((f: { requester_id: string; receiver_id: string }) =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  )
}

async function hasMutualLike(supabase: SupabaseClient, a: string, b: string): Promise<boolean> {
  const [{ data: aToB }, { data: bToA }] = await Promise.all([
    supabase.from('interests').select('id').eq('from_user_id', a).eq('to_user_id', b).maybeSingle(),
    supabase.from('interests').select('id').eq('from_user_id', b).eq('to_user_id', a).maybeSingle(),
  ])
  return !!(aToB && bToA)
}

async function proposalExists(supabase: SupabaseClient, guyId: string, guyFriend: string, girlId: string, girlFriend: string): Promise<boolean> {
  const { data } = await supabase
    .from('double_date_proposals')
    .select('id')
    .or([
      `and(guy1_id.eq.${guyId},guy2_id.eq.${guyFriend},girl1_id.eq.${girlId},girl2_id.eq.${girlFriend})`,
      `and(guy1_id.eq.${guyFriend},guy2_id.eq.${guyId},girl1_id.eq.${girlFriend},girl2_id.eq.${girlId})`,
      `and(guy1_id.eq.${guyId},guy2_id.eq.${guyFriend},girl1_id.eq.${girlFriend},girl2_id.eq.${girlId})`,
      `and(guy1_id.eq.${guyFriend},guy2_id.eq.${guyId},girl1_id.eq.${girlId},girl2_id.eq.${girlFriend})`,
    ].join(','))
    .limit(1)
  return (data?.length ?? 0) > 0
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
    .eq('from_user_id', to_user_id).eq('to_user_id', user.id).maybeSingle()

  if (!mutual) return NextResponse.json({ mutual: false })

  const { data: profiles } = await supabase
    .from('profiles').select('id, gender').in('id', [user.id, to_user_id])
  if (!profiles || profiles.length !== 2) return NextResponse.json({ mutual: true })

  const me = profiles.find(p => p.id === user.id)
  const them = profiles.find(p => p.id === to_user_id)
  if (!me || !them || me.gender === them.gender) return NextResponse.json({ mutual: true })

  const guyId = me.gender === 'male' ? user.id : to_user_id
  const girlId = me.gender === 'female' ? user.id : to_user_id

  const [guyFriends, girlFriends] = await Promise.all([
    getAcceptedFriends(supabase, guyId),
    getAcceptedFriends(supabase, girlId),
  ])

  let created = 0
  for (const guyFriend of guyFriends) {
    for (const girlFriend of girlFriends) {
      if (await hasMutualLike(supabase, guyFriend, girlFriend)) {
        if (!(await proposalExists(supabase, guyId, guyFriend, girlId, girlFriend))) {
          const { error: insertErr } = await supabase.from('double_date_proposals').insert({
            guy1_id: guyId, guy2_id: guyFriend,
            girl1_id: girlId, girl2_id: girlFriend,
            status: 'confirmed',
          })
          if (!insertErr) created++
        }
      }
    }
  }

  return NextResponse.json({ mutual: true, created })
}
