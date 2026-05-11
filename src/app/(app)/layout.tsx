import Navbar from '@/components/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-24 px-4 max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
