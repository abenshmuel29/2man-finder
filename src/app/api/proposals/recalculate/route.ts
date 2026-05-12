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

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).maybeSingle()
  if (!me) return NextResponse.json({ created: 0 })

  const isGuy = me.gender === 'male'

  const [{ data: myLikes }, { data: likesForMe }] = await Promise.all([
    supabase.from('interests').select('to_user_id').eq('from_user_id', user.id),
    supabase.from('interests').select('from_user_id').eq('to_user_id', user.id),
  ])

  const myLikedIds = new Set((myLikes ?? []).map((r: { to_user_id: string }) => r.to_user_id))
  const likedMeIds = new Set((likesForMe ?? []).map((r: { from_user_id: string }) => r.from_user_id))
  const mutualMatchIds = [...myLikedIds].filter(id => likedMeIds.has(id))

  if (mutualMatchIds.length === 0) return NextResponse.json({ created: 0 })

  const { data: matchProfiles } = await supabase
    .from('profiles').select('id, gender').in('id', mutualMatchIds)
  const oppositeGenderMatches = (matchProfiles ?? [])
    .filter((p: { id: string; gender: string }) => isGuy ? p.gender === 'female' : p.gender === 'male')
    .map((p: { id: string }) => p.id)

  if (oppositeGenderMatches.length === 0) return NextResponse.json({ created: 0 })

  const myFriends = await getAcceptedFriends(supabase, user.id)

  let created = 0
  for (const matchId of oppositeGenderMatches) {
    const theirFriends = await getAcceptedFriends(supabase, matchId)
    for (const myFriend of myFriends) {
      for (const theirFriend of theirFriends) {
        if (myFriend === theirFriend) continue
        if (await hasMutualLike(supabase, myFriend, theirFriend)) {
          const guyId = isGuy ? user.id : matchId
          const girlId = isGuy ? matchId : user.id
          const guyFriend = isGuy ? myFriend : theirFriend
          const girlFriend = isGuy ? theirFriend : myFriend
          if (!(await proposalExists(supabase, guyId, guyFriend, girlId, girlFriend))) {
            const { data: newProposal, error } = await supabase.from('double_date_proposals').insert({
              guy1_id: guyId, guy2_id: guyFriend,
              girl1_id: girlId, girl2_id: girlFriend,
              status: 'confirmed',
            }).select('id').single()
            if (!error && newProposal) {
              created++
              // Auto-create group chat for the 4 participants
              const { data: chat } = await supabase
                .from('group_chats')
                .insert({ proposal_id: newProposal.id })
                .select('id')
                .single()
              if (chat) {
                const members = [guyId, guyFriend, girlId, girlFriend]
                await supabase.from('group_chat_members').insert(
                  members.map(uid => ({ chat_id: chat.id, user_id: uid }))
                )
                await supabase.from('group_messages').insert({
                  chat_id: chat.id,
                  sender_id: null,
                  content: '🎉 Your 2Man is confirmed! Start planning your date.',
                  is_system: true,
                })
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ created })
}
