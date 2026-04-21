'use client'

import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f7f6f3' }}>
      <Sidebar profile={null} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}