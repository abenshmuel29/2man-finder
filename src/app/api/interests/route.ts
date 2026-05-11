import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_user_id } = await request.json()
  if (!to_user_id) return NextResponse.json({ error: 'Missing to_user_id' }, { status: 400 })

  // Record the like
  const { error } = await supabase.from('interests').upsert({
    from_user_id: user.id,
    to_user_id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check for mutual match
  const { data: mutual } = await supabase
    .from('interests')
    .select('id')
    .eq('from_user_id', to_user_id)
    .eq('to_user_id', user.id)
    .single()

  if (!mutual) return NextResponse.json({ mutual: false })

  // Get genders to determine who is guy/girl
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, gender')
    .in('id', [user.id, to_user_id])

  if (!profiles || profiles.length !== 2) return NextResponse.json({ mutual: true })

  const me = profiles.find(p => p.id === user.id)
  const them = profiles.find(p => p.id === to_user_id)

  if (!me || !them) return NextResponse.json({ mutual: true })

  const guyId = me.gender === 'male' ? user.id : to_user_id
  const girlId = me.gender === 'female' ? user.id : to_user_id

  if (me.gender === them.gender) return NextResponse.json({ mutual: true }) // same gender, no double date

  // Trigger proposal check via database function
  await supabase.rpc('check_and_create_proposals', {
    p_guy_id: guyId,
    p_girl_id: girlId,
  })

  return NextResponse.json({ mutual: true })
}
