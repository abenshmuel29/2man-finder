import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProposalCard from '@/components/ProposalCard'
import { Heart } from 'lucide-react'

export default async function ProposalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: proposals } = await supabase
    .from('double_date_proposals')
    .select(`
      *,
      guy1:profiles!double_date_proposals_guy1_id_fkey(id, name, age, photos, neighborhood, job),
      guy2:profiles!double_date_proposals_guy2_id_fkey(id, name, age, photos, neighborhood, job),
      girl1:profiles!double_date_proposals_girl1_id_fkey(id, name, age, photos, neighborhood, job),
      girl2:profiles!double_date_proposals_girl2_id_fkey(id, name, age, photos, neighborhood, job)
    `)
    .or(`guy1_id.eq.${user.id},guy2_id.eq.${user.id},girl1_id.eq.${user.id},girl2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const { data: confirmations } = await supabase
    .from('proposal_confirmations')
    .select('proposal_id')
    .eq('user_id', user.id)

  const myConfirmedProposalIds = new Set(confirmations?.map(c => c.proposal_id) ?? [])

  const pending = proposals?.filter(p => p.status === 'pending') ?? []
  const confirmed = proposals?.filter(p => p.status === 'confirmed') ?? []

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Double Dates</h1>
        <p className="text-gray-500 text-sm">Your double date proposals</p>
      </div>

      {proposals?.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="text-6xl">💕</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">No proposals yet</h2>
            <p className="text-gray-400 text-sm">
              Like someone in Discover, and when two pairs from the same friend groups mutually match, a double date proposal is automatically created!
            </p>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Pending ({pending.length})
          </h2>
          {pending.map(p => (
            <ProposalCard key={p.id} proposal={p} userId={user.id} hasConfirmed={myConfirmedProposalIds.has(p.id)} />
          ))}
        </div>
      )}

      {confirmed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Heart size={18} className="text-pink-400" /> Confirmed Dates
          </h2>
          {confirmed.map(p => (
            <ProposalCard key={p.id} proposal={p} userId={user.id} hasConfirmed={myConfirmedProposalIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
