import Navbar from '@/components/Navbar'
import AppHomescreenBanner from '@/components/AppHomescreenBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-4 max-w-lg mx-auto w-full">
        {children}
      </main>
      {/* PWA install nudge — sits above bottom nav, client-side only */}
      <AppHomescreenBanner />
    </div>
  )
}
