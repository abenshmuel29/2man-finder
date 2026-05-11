'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfileCard from '@/components/ProfileCard'
import { type Profile, type Neighborhood, NEIGHBORHOODS } from '@/lib/types'
import { SlidersHorizontal } from 'lucide-react'

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myGender, setMyGender] = useState<string | null>(null)
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<Neighborhood | ''>('')
  const [showFilter, setShowFilter] = useState(false)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: me } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
    if (!me) return
    setMyGender(me.gender)

    const oppositeGender = me.gender === 'male' ? 'female' : 'male'

    // Get already interacted user IDs
    const [{ data: liked }, { data: passed }] = await Promise.all([
      supabase.from('interests').select('to_user_id').eq('from_user_id', user.id),
      supabase.from('passes').select('to_user_id').eq('from_user_id', user.id),
    ])

    const excludeIds = [
      user.id,
      ...(liked?.map(l => l.to_user_id) ?? []),
      ...(passed?.map(p => p.to_user_id) ?? []),
    ]

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('gender', oppositeGender)
      .eq('profile_complete', true)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(20)

    if (neighborhoodFilter) {
      query = query.eq('neighborhood', neighborhoodFilter)
    }

    const { data } = await query
    setProfiles(data ?? [])
    setCurrentIndex(0)
    setLoading(false)
  }, [neighborhoodFilter])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const currentProfile = profiles[currentIndex]
  const hasMore = currentIndex < profiles.length - 1

  function handleNext() {
    if (hasMore) {
      setCurrentIndex(i => i + 1)
    } else {
      loadProfiles()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-gray-400">Finding people near you...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover</h1>
          <p className="text-gray-500 text-sm">Browse {myGender === 'male' ? 'girls' : 'guys'} in Miami</p>
        </div>
        <button onClick={() => setShowFilter(f => !f)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: showFilter ? '#8B5CF6' : '#252540', border: '1px solid #2D2D50', color: 'white' }}>
          <SlidersHorizontal size={16} /> Filter
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-300">Filter by neighborhood</p>
          <select className="input-field" value={neighborhoodFilter}
            onChange={e => setNeighborhoodFilter(e.target.value as Neighborhood | '')}>
            <option value="">All Miami</option>
            {NEIGHBORHOODS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
      )}

      {/* Profile card or empty state */}
      {currentProfile ? (
        <>
          <p className="text-xs text-gray-600 text-center">{currentIndex + 1} of {profiles.length}</p>
          <ProfileCard profile={currentProfile} onNext={handleNext} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="text-6xl">🔍</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">No more profiles</h2>
            <p className="text-gray-400 text-sm">
              {neighborhoodFilter
                ? "No one left in this area. Try removing the filter."
                : "You've seen everyone for now. Check back later!"}
            </p>
          </div>
          <button onClick={loadProfiles} className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
