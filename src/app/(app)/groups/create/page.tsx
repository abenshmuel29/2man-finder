'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { type Gender } from '@/lib/types'

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !gender) { setError('Name and gender are required'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('friend_groups')
      .insert({ name, description, gender, creator_id: user.id })
      .select()
      .single()

    if (groupError || !group) {
      setError(groupError?.message ?? 'Failed to create group')
      setLoading(false)
      return
    }

    // Auto-approve the creator
    await supabase.from('friend_group_members').insert({
      group_id: group.id,
      user_id: user.id,
      status: 'approved',
      vote_count: 1,
      invited_by: user.id,
    })

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/groups" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="text-2xl font-bold text-white">Create Group</h1>
      </div>

      <div className="card p-5 text-sm text-gray-400 flex flex-col gap-2">
        <p className="font-semibold text-white">How friend groups work</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Groups can have up to 20 members</li>
          <li>1/3 of existing members must approve new members</li>
          <li>Any 2 members from your group can pair for a double date</li>
          <li>Guys groups match with girls groups for double dates</li>
        </ul>
      </div>

      <form onSubmit={handleCreate} className="card p-6 flex flex-col gap-5">
        {error && (
          <div className="p-3 rounded-lg text-sm text-red-300" style={{ background: '#2D1515', border: '1px solid #7F1D1D' }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-300">Group Name</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. The Brickell Boys" required />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-300">Description <span className="text-gray-500">(optional)</span></label>
          <textarea className="input-field" rows={2} value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell people about your group..." style={{ resize: 'none' }} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Group Gender</label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as Gender[]).map(g => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className="py-4 rounded-xl font-semibold text-lg transition-all"
                style={{ background: gender === g ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#252540', border: `1px solid ${gender === g ? '#8B5CF6' : '#2D2D50'}`, color: 'white' }}>
                {g === 'male' ? '👨 Guys Group' : '👩 Girls Group'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">Guys groups match with girls groups for double dates</p>
        </div>

        <button type="submit" disabled={loading || !name || !gender} className="btn-primary mt-2">
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  )
}
