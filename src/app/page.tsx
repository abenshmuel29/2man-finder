import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16" style={{ background: 'radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)' }}>
      <div className="max-w-md w-full text-center flex flex-col items-center gap-8">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            👥
          </div>
          <h1 className="text-5xl font-black gradient-text">2Man Finder</h1>
          <p className="text-gray-400 text-lg font-medium">Miami&apos;s double date app</p>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-bold text-white">Two girls. Two guys.<br />A 2Man you will never forget.</p>
          <p className="text-gray-400">Find your perfect double date through your friends. No randoms — just real connections.</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['👫 Friends Only', '📍 Miami Only', '✅ Real Connections', '📲 Snap & IG Exchange'].map(f => (
            <span key={f} className="px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: '#252540', border: '1px solid #2D2D50', color: '#C4B5FD' }}>
              {f}
            </span>
          ))}
        </div>

        {/* How it works */}
        <div className="card w-full p-6 text-left flex flex-col gap-4">
          <h3 className="font-bold text-white text-lg">How it works</h3>
          {[
            ['1', 'Sign up and add your friends — guys follow guys, girls follow girls'],
            ['2', 'Browse and hit 2Man on someone you\'re feeling'],
            ['3', 'When you and a friend each match with two girls who are also friends, a double date is set'],
            ['4', 'Confirm within 24hrs — Snap & IG are exchanged'],
          ].map(([num, text]) => (
            <div key={num} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                {num}
              </span>
              <p className="text-gray-300 text-sm pt-0.5">{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link href="/signup" className="btn-primary text-lg py-4">
            Join 2Man Finder
          </Link>
          <Link href="/login" className="btn-secondary">
            Already have an account? Sign in
          </Link>
        </div>

        <p className="text-gray-600 text-xs">Currently only available in Miami, FL</p>
      </div>
    </div>
  )
}
