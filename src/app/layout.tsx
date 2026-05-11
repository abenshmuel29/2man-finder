import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '2Man Finder',
  description: 'Double date matching for Miami. Two guys. Two girls. One great night.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#0D0D1A] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
