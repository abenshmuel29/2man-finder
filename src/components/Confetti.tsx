'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function Confetti() {
  useEffect(() => {
    const colors = ['#FF4D6D', '#9B5DE5', '#FF6B9D', '#C77DFF', '#ffffff']

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0, x: 0.5 },
        disableForReducedMotion: true,
        colors,
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      })
    }

    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2,  { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1,  { spread: 120, startVelocity: 45 })

    return () => { confetti.reset() }
  }, [])

  return null
}
