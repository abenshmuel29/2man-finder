'use client'

import { useState, useEffect } from 'react'
import AddToHomeScreen from './AddToHomeScreen'

// Thin wrapper that positions the banner as a fixed overlay
// just above the bottom nav inside the main app.
export default function AppHomescreenBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Wait one tick so localStorage is available and hydration is clean
    setShow(true)
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4 max-w-lg mx-auto"
      // 64px = approx bottom nav height; component hides itself when
      // installed or dismissed so no further logic needed here
      style={{ bottom: 64 }}
    >
      <AddToHomeScreen />
    </div>
  )
}
