'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NEIGHBORHOODS, BODY_TYPES, type Gender, type Neighborhood, type BodyType } from '@/lib/types'
import { Upload, X } from 'lucide-react'

const STEPS = ['Basic Info', 'Stats', 'About You', 'Social & Location', 'Photos']

function ProfileSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const joinGroupId = searchParams.get('join')
  const invitedBy = searchParams.get('invitedBy')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bodyType, setBodyType] = useState<BodyType | ''>('')
  const [bio, setBio] = useState('')
  const [school, setSchool] = useState('')
  const [snapchat, setSnapchat] = useState('')
  const [instagram, setInstagram] = useState('')
  const [neighborhood, setNeighborhood] = useState<Neighborhood | ''>('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)

      // Pre-fill existing profile data for editing
      const { data: existing } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (existing?.profile_complete) {
        setName(existing.name ?? '')
        setGender(existing.gender ?? '')
        setAge(existing.age?.toString() ?? '')
        setHeight(existing.height ?? '')
        setWeight(existing.weight ?? '')
        setBodyType(existing.body_type ?? '')
        setBio(existing.bio ?? '')
        setSchool(existing.school ?? '')
        setSnapchat(existing.snapchat ?? '')
        setInstagram(existing.instagram ?? '')
        setNeighborhood(existing.neighborhood ?? '')
        setPhotos(existing.photos ?? [])
      }
    }
    init()
  }, [router])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !userId) return
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const available = 5 - photos.length
    const toUpload = files.slice(0, available)
    if (toUpload.length === 0) return

    setUploading(true)
    setUploadProgress(`Uploading ${toUpload.length} photo${toUpload.length > 1 ? 's' : ''}...`)
    const supabase = createClient()

    const results = await Promise.all(
      toUpload.map(async file => {
        const ext = file.name.split('.').pop()
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('photos').upload(path, file)
        if (error) return null
        const { data } = supabase.storage.from('photos').getPublicUrl(path)
        return data.publicUrl
      })
    )

    const uploaded = results.filter(Boolean) as string[]
    setPhotos(prev => [...prev, ...uploaded])
    setUploading(false)
    setUploadProgress('')
    // Reset input so same files can be re-selected if needed
    e.target.value = ''
  }

  async function handleSubmit() {
    if (!userId) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      name, gender, age: parseInt(age), height, weight, body_type: bodyType,
      bio, school, snapchat, instagram,
      neighborhood, photos, profile_complete: true, updated_at: new Date().toISOString(),
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Auto-send friend request if user joined via invite
    if (invitedBy) {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: invitedBy }),
      }).catch(() => {})
    }

    router.push(joinGroupId ? `/join/${joinGroupId}` : '/profile')
  }

  const steps = [
    // Step 0: Basic Info
    <div key={0} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Full Name</label>
        <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">I am a...</label>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as Gender[]).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className="py-4 rounded-xl font-semibold text-lg transition-all"
              style={{ background: gender === g ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#252540', border: `1px solid ${gender === g ? '#8B5CF6' : '#2D2D50'}`, color: 'white' }}>
              {g === 'male' ? '👨 Guy' : '👩 Girl'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Age</label>
        <input type="number" className="input-field" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 24" min="18" max="40" />
      </div>
    </div>,

    // Step 1: Stats
    <div key={1} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Height</label>
        <input className="input-field" value={height} onChange={e => setHeight(e.target.value)} placeholder={`e.g. 5'10"`} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Weight</label>
        <input className="input-field" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 175 lbs" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Body Type</label>
        <div className="grid grid-cols-2 gap-2">
          {BODY_TYPES.map(bt => (
            <button key={bt.value} type="button" onClick={() => setBodyType(bt.value)}
              className="py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: bodyType === bt.value ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#252540', border: `1px solid ${bodyType === bt.value ? '#8B5CF6' : '#2D2D50'}`, color: 'white' }}>
              {bt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">School / University</label>
        <input className="input-field" value={school} onChange={e => setSchool(e.target.value)} placeholder="e.g. University of Miami" />
      </div>
    </div>,

    // Step 2: About You
    <div key={2} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">About You <span className="text-gray-500">(optional)</span></label>
        <textarea className="input-field" rows={5} value={bio} onChange={e => setBio(e.target.value)}
          placeholder="Tell people about yourself — include some hobbies & interests!"
          style={{ resize: 'none' }} />
      </div>
    </div>,

    // Step 3: Social & Location
    <div key={3} className="flex flex-col gap-5">
      <p className="text-gray-400 text-sm">Your social media will only be shared after a confirmed double date.</p>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Snapchat Username</label>
        <input className="input-field" value={snapchat} onChange={e => setSnapchat(e.target.value)} placeholder="your_snap" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Instagram Username</label>
        <input className="input-field" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="your_insta" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-300">Your Miami Neighborhood</label>
        <select className="input-field" value={neighborhood} onChange={e => setNeighborhood(e.target.value as Neighborhood)}>
          <option value="">Select your area</option>
          {NEIGHBORHOODS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
        </select>
      </div>
    </div>,

    // Step 4: Photos
    <div key={4} className="flex flex-col gap-5">
      <p className="text-gray-400 text-sm">Add at least 3 photos (max 5). You can select multiple at once.</p>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
            <img src={url} alt="profile" className="w-full h-full object-cover" />
            <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)' }}>
              <X size={12} />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
            style={{ borderColor: '#2D2D50', color: '#6B7280' }}>
            <Upload size={24} />
            <span className="text-sm mt-2 text-center px-2">
              {uploading ? uploadProgress : 'Add Photos'}
            </span>
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        )}
      </div>
      <p className="text-xs" style={{ color: photos.length >= 3 ? '#4ADE80' : '#9CA3AF' }}>
        {photos.length}/5 photos {photos.length < 3 ? `— add ${3 - photos.length} more` : '✓'}
      </p>
    </div>,
  ]

  const canProceed = [
    name && gender && age,
    height || weight || bodyType,
    true,
    neighborhood,
    photos.length >= 3,
  ][step]

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16"
      style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)' }}>
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <span className="text-2xl font-black gradient-text">2Man Finder</span>
          <p className="text-gray-400 text-sm mt-1">
            {invitedBy ? 'Set up your profile to connect' : 'Set up your profile'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? '#8B5CF6' : '#2D2D50' }} />
          ))}
        </div>
        <p className="text-sm font-semibold text-white">{STEPS[step]} <span className="text-gray-500">({step + 1}/{STEPS.length})</span></p>

        <form onSubmit={e => e.preventDefault()} className="card p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-300" style={{ background: '#2D1515', border: '1px solid #7F1D1D' }}>
              {error}
            </div>
          )}
          {steps[step]}
        </form>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed} className="btn-primary flex-1">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || photos.length < 3} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileSetupPage() {
  return <Suspense><ProfileSetupContent /></Suspense>
}
