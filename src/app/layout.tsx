import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-syne' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-dm' })

export const metadata: Metadata = {
  title: '2Man Finder',
  description: 'Double date matching for Miami. Two guys. Two girls. One great night.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '2Man Finder',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
        style={{ background: '#08080F', color: 'white', fontFamily: 'var(--font-dm), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
