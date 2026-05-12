import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { NEIGHBORHOODS } from '@/lib/types'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: inviter } = await supabase
    .from('profiles')
    .select('id, name, photos, neighborhood, gender')
    .eq('id', token)
    .single()

  const neighborhoodLabel = inviter?.neighborhood
    ? NEIGHBORHOODS.find(n => n.value === inviter.neighborhood)?.label
    : null

  const signupUrl = `/signup?invitedBy=${token}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="text-center">
          <p className="text-3xl font-black gradient-text" style={{ fontFamily: 'var(--font-syne)' }}>
            2Man Finder
          </p>
          <p className="text-gray-400 text-sm mt-1">Miami&apos;s double date app</p>
        </div>

        {/* Inviter card */}
        {inviter ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '3px solid rgba(155,93,229,0.6)', background: '#13131F' }}>
              {inviter.photos?.[0]
                ? <img src={inviter.photos[0]} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">
                    {inviter.gender === 'male' ? '👨' : '👩'}
                  </div>}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">
                {inviter.name} invited you!
              </h1>
              {neighborhoodLabel && (
                <p className="text-gray-400 text-sm flex items-center justify-center gap-1 mt-1">
                  <MapPin size={13} />{neighborhoodLabel}
                </p>
              )}
              <p className="text-gray-300 text-sm mt-3 leading-relaxed">
                Join 2Man Finder — Miami&apos;s app for setting up double dates with friends.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
              style={{ background: '#13131F', border: '2px solid rgba(155,93,229,0.3)' }}>
              🤝
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">You&apos;re Invited!</h1>
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                Join 2Man Finder — Miami&apos;s app for setting up double dates with friends.
              </p>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="card p-5 w-full flex flex-col gap-3">
          <h2 className="font-bold text-white text-sm">How it works</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { icon: '👫', text: 'Add friends of the same gender' },
              { icon: '❤️', text: 'Match with people of the opposite gender' },
              { icon: '🎉', text: 'When two friends both match, a 2Man is on!' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="w-full flex flex-col gap-3">
          <Link href={signupUrl}
            className="btn-primary text-center text-base font-bold py-4"
            style={{ display: 'block' }}>
            Join 2Man Finder 🎉
          </Link>
          <p className="text-center text-gray-500 text-xs">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 font-semibold">Sign in</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
