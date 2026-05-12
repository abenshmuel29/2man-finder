'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true)
}

const DISMISS_KEY = '2mf_aths_dismissed'

export default function AddToHomeScreen() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isStandalone()) return
    if (localStorage.getItem(DISMISS_KEY)) return

    const p = detectPlatform()
    // Only show on mobile devices we can guide
    if (p === 'ios' || p === 'android') {
      setPlatform(p)
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const isIos = platform === 'ios'
  const videoSrc = isIos
    ? '/videos/add-to-homescreen-ios.mp4'
    : '/videos/add-to-homescreen-android.mp4'

  const steps = isIos
    ? ['Tap the Share button \u{1F4E4} at the bottom of Safari', 'Scroll down and tap “Add to Home Screen”', 'Tap “Add” — done!']
    : ['Tap the 3-dot menu ⋮ in Chrome', 'Tap “Add to Home screen”', 'Tap “Add” — done!']

  return (
    <div
      className="w-full flex flex-col gap-4 rounded-2xl p-5"
      style={{
        background: '#0F0F1C',
        border: '1px solid rgba(155,93,229,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <p
            className="font-bold text-white leading-snug"
            style={{ fontFamily: 'var(--font-syne)', fontSize: 15 }}
          >
            We&apos;ll be on the App Store soon!
          </p>
          <p style={{ color: '#9B8FC0', fontSize: 13, lineHeight: 1.5 }}>
            In the mean time, add us to your home screen 👇
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: '#1E1E30' }}
        >
          <X size={14} style={{ color: '#6B6A8A' }} />
        </button>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
              style={{
                background: 'linear-gradient(135deg,#FF4D6D,#9B5DE5)',
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              {i + 1}
            </span>
            <p style={{ color: '#C0BFDA', fontSize: 13, lineHeight: 1.5 }}>{step}</p>
          </li>
        ))}
      </ol>

      {/* Video */}
      <div
        className="mx-auto overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 280,
          borderRadius: 16,
          border: '1.5px solid transparent',
          background:
            'linear-gradient(#0F0F1C,#0F0F1C) padding-box, linear-gradient(135deg,#FF4D6D,#9B5DE5) border-box',
        }}
      >
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="w-full block"
          style={{ borderRadius: 14 }}
        />
      </div>
    </div>
  )
}
