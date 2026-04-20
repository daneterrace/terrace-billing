import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Terrace | Utility Billing',
  description: 'Utility billing management for Terrace Business Centres',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased" style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
