import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden"
      style={{ background: '#08080F' }}>

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,93,229,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '5%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,77,109,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-md w-full text-center flex flex-col items-center gap-8 relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, #FF4D6D, #9B5DE5)', boxShadow: '0 8px 32px rgba(255,77,109,0.35)' }}>
            👥
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 52, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}
            className="gradient-text">2Man Finder</h1>
          <p style={{ color: '#7B7A96', fontSize: 17, lineHeight: 1.5 }}>Miami&apos;s double date app</p>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, fontFamily: 'var(--font-syne)' }}>
            Two girls. Two guys.<br />A 2Man you will never forget.
          </p>
          <p style={{ color: '#7B7A96', lineHeight: 1.6, fontSize: 15 }}>
            Find your perfect double date through your friends. No randoms — just real connections.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['👫 Friends Only', '📍 Miami Only', '✅ Real Connections', '📲 Snap & IG Exchange'].map(f => (
            <span key={f} className="px-4 py-2 text-sm font-medium"
              style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, color: '#C77DFF', lineHeight: 1.5 }}>
              {f}
            </span>
          ))}
        </div>

        {/* How it works */}
        <div className="card w-full p-6 text-left flex flex-col gap-4">
          <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18, lineHeight: 1.4 }}>How it works</h3>
          {[
            ['1', 'Sign up and add your friends — guys follow guys, girls follow girls'],
            ['2', 'Browse and hit 2Man on someone you\'re feeling'],
            ['3', 'When you and a friend each match with two girls who are also friends, a double date is set'],
            ['4', 'Socials are instantly unlocked — Snap & IG exchanged'],
          ].map(([num, text]) => (
            <div key={num} className="flex items-start gap-3">
              <span className="flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg, #FF4D6D, #9B5DE5)', borderRadius: 8, width: 28, height: 28, minWidth: 28, fontFamily: 'var(--font-syne)', lineHeight: 1 }}>
                {num}
              </span>
              <p style={{ color: '#c0bfd4', fontSize: 14, lineHeight: 1.6, paddingTop: 4 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link href="/signup" className="btn-primary" style={{ fontSize: 17, padding: '1rem 1.5rem' }}>
            Join 2Man Finder
          </Link>
          <Link href="/login" className="btn-secondary">
            Already have an account? Sign in
          </Link>
        </div>

        <p style={{ color: '#7B7A96', fontSize: 12, lineHeight: 1.5 }}>Currently only available in Miami, FL · Must be 18+</p>
      </div>
    </div>
  )
}
