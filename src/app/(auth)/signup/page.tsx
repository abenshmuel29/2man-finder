'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/profile/setup')
      router.refresh()
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16"
      style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)' }}>
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-black gradient-text">2Man Finder</Link>
          <p className="text-gray-400 mt-2">Join Miami&apos;s double date app</p>
        </div>

        <form onSubmit={handleSignup} className="card p-8 flex flex-col gap-5">
          <h2 className="text-xl font-bold text-white">Create Account</h2>

          {error && (
            <div className="p-3 rounded-lg text-sm text-red-300" style={{ background: '#2D1515', border: '1px solid #7F1D1D' }}>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="input-field" placeholder="you@example.com" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="input-field" placeholder="At least 6 characters" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Confirm Password</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
              className="input-field" placeholder="Re-enter password" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By signing up, you agree to only use this app in Miami, FL.
          </p>
        </form>

        <p className="text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 font-semibold hover:text-purple-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
